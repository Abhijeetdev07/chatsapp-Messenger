import { create } from 'zustand';

export interface ActiveCall {
  conversationId: string;
  targetUserId: string;
  type: 'audio' | 'video';
  callerInfo?: any;
  isIncoming: boolean;
}

type CallStatus = 'idle' | 'ringing' | 'connecting' | 'in-call' | 'ended';

interface CallState {
  activeCall: ActiveCall | null;
  callStatus: CallStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;

  initiateCall: (call: ActiveCall) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  setCallStatus: (status: CallStatus) => void;
  setIncomingCall: (call: ActiveCall) => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  callStatus: 'idle',
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,

  initiateCall: (call) => set({
    activeCall: call,
    callStatus: 'ringing',
    isMuted: false,
    isCameraOff: call.type === 'audio',
  }),

  setIncomingCall: (call) => set({
    activeCall: { ...call, isIncoming: true },
    callStatus: 'ringing',
  }),

  acceptCall: () => set({ callStatus: 'connecting' }),

  rejectCall: () => {
    const { localStream } = get();
    // Cleanly destroy media tracks to release camera/mic hardware
    localStream?.getTracks().forEach(track => track.stop());
    set({
      activeCall: null,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
    });
  },

  endCall: () => {
    const { localStream, remoteStream } = get();
    localStream?.getTracks().forEach(track => track.stop());
    remoteStream?.getTracks().forEach(track => track.stop());
    set({
      activeCall: null,
      callStatus: 'idle',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
    });
  },

  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => { track.enabled = isMuted; });
    }
    set({ isMuted: !isMuted });
  },

  toggleCamera: () => {
    const { localStream, isCameraOff } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach(track => { track.enabled = isCameraOff; });
    }
    set({ isCameraOff: !isCameraOff });
  },

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),
  setCallStatus: (status) => set({ callStatus: status }),
}));
