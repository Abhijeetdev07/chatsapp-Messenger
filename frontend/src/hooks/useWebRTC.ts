'use client';

import { useRef, useCallback, useEffect } from 'react';
import SimplePeer, { Instance as PeerInstance } from 'simple-peer';
import { useCallStore } from '@/store/useCallStore';
import { useSocketStore } from '@/store/useSocketStore';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // ── TURN Server for Production (Fallback when STUN fails on strict NATs) ──
  // {
  //   urls: process.env.NEXT_PUBLIC_TURN_URL || 'turn:your-turn-server.com:3478',
  //   username: process.env.NEXT_PUBLIC_TURN_USERNAME || 'guest',
  //   credential: process.env.NEXT_PUBLIC_TURN_PASSWORD || 'somepassword',
  // },
];

export function useWebRTC() {
  const socket = useSocketStore((s) => s.socket);
  const user = useAuthStore((s) => s.user);
  const {
    activeCall,
    callStatus,
    setCallStatus,
    setLocalStream,
    setRemoteStream,
    initiateCall,
    setIncomingCall,
    acceptCall,
    endCall: storeEndCall,
  } = useCallStore();

  const peerRef = useRef<PeerInstance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // ── Acquire local media ──────────────────────────
  const getLocalStream = useCallback(async (callType: 'audio' | 'video') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      toast.error('Could not access camera/microphone');
      throw err;
    }
  }, [setLocalStream]);

  // ── Create peer instance ─────────────────────────
  const createPeer = useCallback((initiator: boolean, stream: MediaStream, targetUserId: string) => {
    // Destroy any existing peer
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: { iceServers: ICE_SERVERS },
    });

    // Signal data → relay via socket
    peer.on('signal', (signalData) => {
      if (!socket) return;

      if (signalData.type === 'offer') {
        socket.emit('webrtc_offer', {
          targetUserId,
          signalData,
        });
      } else if (signalData.type === 'answer') {
        socket.emit('webrtc_answer', {
          targetUserId,
          signalData,
        });
      } else if ((signalData as any).candidate) {
        socket.emit('webrtc_ice_candidate', {
          targetUserId,
          candidate: signalData,
        });
      }
    });

    // Remote stream received
    peer.on('stream', (remoteStream) => {
      setRemoteStream(remoteStream);
      setCallStatus('in-call');
    });

    // Connection established
    peer.on('connect', () => {
      // Ringing ends, call is active
      setCallStatus('in-call');
    });

    // Error handling
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      toast.error('Call connection failed');
      cleanupCall();
    });

    // Peer closed
    peer.on('close', () => {
      cleanupCall();
    });

    peerRef.current = peer;
    return peer;
  }, [socket, setRemoteStream, setCallStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start outgoing call ──────────────────────────
  const startCall = useCallback(async (
    conversationId: string,
    targetUserId: string,
    callType: 'audio' | 'video',
    targetUsername?: string,
  ) => {
    if (!socket || !user) return;

    try {
      // Acquire local media
      await getLocalStream(callType);

      // Update store
      initiateCall({
        conversationId,
        targetUserId,
        type: callType,
        isIncoming: false,
      });

      // Notify the remote user via socket
      socket.emit('call_invite', {
        conversationId,
        targetUserId,
        callType,
        callerName: user.username,
      });

      // We DO NOT createPeer here anymore. 
      // We must wait for 'call_accept' from the remote user before sending the WebRTC offer,
      // otherwise the remote user will miss the offer while they are still ringing.
      setCallStatus('ringing');
    } catch (err) {
      console.error('Failed to start call:', err);
    }
  }, [socket, user, getLocalStream, initiateCall, setCallStatus]);

  // ── Answer incoming call ─────────────────────────
  const answerCall = useCallback(async () => {
    if (!activeCall || !socket) return;

    try {
      const stream = await getLocalStream(activeCall.type);
      acceptCall();
      setCallStatus('connecting');

      // Notify caller that we accepted
      socket.emit('call_accept', {
        targetUserId: activeCall.targetUserId,
        conversationId: activeCall.conversationId,
      });

      // Create peer as non-initiator. 
      // We will now wait for the caller to send us the WebRTC offer.
      createPeer(false, stream, activeCall.targetUserId);
    } catch (err) {
      console.error('Failed to answer call:', err);
    }
  }, [activeCall, socket, getLocalStream, acceptCall, setCallStatus, createPeer]);

  // ── Cleanup everything ───────────────────────────
  const cleanupCall = useCallback(() => {
    // Only play disconnect sound if we were actually in a call
    const wasInCall = callStatus === 'in-call';
    if (wasInCall) {
      // No sound played for now
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    storeEndCall();
  }, [storeEndCall, callStatus]);

  // ── Reject / Decline call ────────────────────────
  const rejectCall = useCallback(() => {
    if (!socket || !activeCall) return;

    socket.emit('call_reject', {
      targetUserId: activeCall.targetUserId,
      conversationId: activeCall.conversationId,
    });

    cleanupCall();
  }, [socket, activeCall, cleanupCall]);

  // ── End ongoing call ─────────────────────────────
  const endOngoingCall = useCallback(() => {
    if (!socket || !activeCall) return;

    socket.emit('call_end', {
      targetUserId: activeCall.targetUserId,
      conversationId: activeCall.conversationId,
    });

    cleanupCall();
  }, [socket, activeCall, cleanupCall]);

  // ── Socket event listeners ───────────────────────
  useEffect(() => {
    if (!socket) return;

    // Incoming call
    const handleIncomingCall = (data: {
      conversationId: string;
      callerUserId: string;
      callerInfo: { username: string };
      type: 'audio' | 'video';
      callType?: 'audio' | 'video';
    }) => {
      // Reject if already in a call
      if (callStatus !== 'idle') {
        socket.emit('call_reject', {
          targetUserId: data.callerUserId,
          conversationId: data.conversationId,
          reason: 'busy',
        });
        return;
      }

      setIncomingCall({
        conversationId: data.conversationId,
        targetUserId: data.callerUserId,
        type: data.callType || data.type,
        callerInfo: data.callerInfo,
        isIncoming: true,
      });
    };

    // Call accepted by remote (Caller receives this)
    const handleCallAccepted = (data: { acceptedBy?: string }) => {
      setCallStatus('connecting');
      
      // NOW we create the peer and generate the offer, because the remote user 
      // is officially listening for our signal.
      if (localStreamRef.current && activeCall) {
        createPeer(true, localStreamRef.current, activeCall.targetUserId);
      }
    };

    // Call rejected by remote
    const handleCallRejected = (data: { reason?: string }) => {
      toast.error(data.reason === 'busy' ? 'User is on another call' : 'Call declined');
      cleanupCall();
    };

    // Call ended by remote
    const handleCallEnded = () => {
      toast('Call ended');
      cleanupCall();
    };

    // WebRTC signaling: offer
    const handleOffer = (data: { signalData: SimplePeer.SignalData; fromUserId: string }) => {
      if (peerRef.current) {
        peerRef.current.signal(data.signalData);
      }
    };

    // WebRTC signaling: answer
    const handleAnswer = (data: { signalData: SimplePeer.SignalData; fromUserId: string }) => {
      if (peerRef.current) {
        peerRef.current.signal(data.signalData);
      }
    };

    // WebRTC signaling: ICE candidate
    const handleIceCandidate = (data: { candidate: SimplePeer.SignalData; fromUserId: string }) => {
      if (peerRef.current) {
        peerRef.current.signal(data.candidate);
      }
    };

    // Note: Use correct backend event names!
    socket.on('call_invite', handleIncomingCall);
    socket.on('call_accept', handleCallAccepted);
    socket.on('call_reject', handleCallRejected);
    socket.on('call_end', handleCallEnded);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('call_invite', handleIncomingCall);
      socket.off('call_accept', handleCallAccepted);
      socket.off('call_reject', handleCallRejected);
      socket.off('call_end', handleCallEnded);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, callStatus, activeCall, setIncomingCall, setCallStatus, cleanupCall, createPeer]);

  return {
    startCall,
    answerCall,
    rejectCall,
    endCall: endOngoingCall,
    cleanupCall,
  };
}
