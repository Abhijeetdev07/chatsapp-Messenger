'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Minimize2, Maximize2, SwitchCamera, Phone } from 'lucide-react';
import { useCallStore } from '@/store/useCallStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { format } from 'date-fns';

export default function CallOverlay() {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
  } = useCallStore();

  const { endCall, answerCall, rejectCall } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isMinimized, setIsMinimized] = useState(false);
  const [duration, setDuration] = useState(0);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Duration timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (callStatus === 'in-call') {
      interval = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Format duration (MM:SS)
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Flip camera (mobile/tablets)
  const handleSwitchCamera = async () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      // Find all video input devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');

      if (videoDevices.length > 1) {
        const currentSetting = videoTrack.getSettings() as any;
        const currentFacingMode = currentSetting.facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        localStream.removeTrack(videoTrack);
        localStream.addTrack(newVideoTrack);
        videoTrack.stop();
      }
    } catch (err) {
      console.error('Failed to switch camera', err);
    }
  };

  // If no call is active, don't render anything
  if (!activeCall || callStatus === 'idle' || callStatus === 'ended') return null;

  // ── ────────────────────────────── ──
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] bg-surface border border-border rounded-xl shadow-xl shadow-black/20 p-3 flex items-center gap-4 animate-slide-up cursor-pointer hover:bg-surface-hover transition-colors"
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-12 h-12 rounded-full overflow-hidden bg-background">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-foreground">Active Call</p>
          <p className="text-xs text-green-400 font-mono">{formatDuration(duration)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); endCall(); }}
            className="p-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Full Screen Audio/Video Overlay ──
  const isVideoRendered = activeCall.type === 'video';

  return (
    <div className="fixed inset-0 z-[100] bg-[#111111] flex flex-col md:flex-row overflow-hidden animate-fade-in relative">
      
      {/* Background / Remote Video (Large view) */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {remoteStream && isVideoRendered ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        ) : (
          /* Avatar fallback if audio or video off */
          <div className="flex flex-col items-center">
            <div className={`w-36 h-36 rounded-full bg-primary-900 flex items-center justify-center text-white text-5xl mb-6 shadow-2xl ${callStatus === 'ringing' || callStatus === 'connecting' ? 'animate-pulse' : ''}`}>
              {activeCall.callerInfo?.username?.charAt(0).toUpperCase() || '?'}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {activeCall.callerInfo?.username || 'Unknown User'}
            </h2>
            <p className="text-white/60 text-lg">
              {callStatus === 'ringing' && 'Ringing...'}
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'in-call' && <span className="font-mono tracking-widest text-[#4ade80]">{formatDuration(duration)}</span>}
            </p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        {localStream && isVideoRendered && !isCameraOff && (
          <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[3/4] md:aspect-video bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 z-10 transition-all hover:scale-105 cursor-move">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform ${
                /* Mirror front camera horizontally */
                localStream.getVideoTracks()[0]?.getSettings().facingMode !== 'environment' ? 'scale-x-[-1]' : ''
              }`}
            />
          </div>
        )}

        {/* Top bar controls */}
        <div className="absolute top-6 left-6 z-10">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors shadow-lg"
            title="Minimize call"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Control Bar (Bottom block/bar) */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 md:gap-6 bg-white/10 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl shadow-2xl z-20">
        
        {/* Mute */}
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all flex items-center justify-center ${
            isMuted ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-gray-900 hover:bg-gray-200'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Toggle (only for video calls) */}
        {isVideoRendered && (
          <button
            onClick={toggleCamera}
            className={`p-4 rounded-full transition-all flex items-center justify-center ${
              isCameraOff ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-white text-gray-900 hover:bg-gray-200'
            }`}
            title={isCameraOff ? 'Turn on camera' : 'Turn off camera'}
          >
            {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* Switch Camera (Mobile only via facingMode) */}
        {isVideoRendered && navigator.mediaDevices.getSupportedConstraints().facingMode && (
          <button
            onClick={handleSwitchCamera}
            className="hidden md:flex p-4 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all items-center justify-center"
            title="Switch camera"
          >
            <SwitchCamera className="w-6 h-6" />
          </button>
        )}

        {/* End Call */}
        <button
          onClick={endCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/20 hover:scale-105 ml-2 flex items-center justify-center"
          title="End Call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>

    </div>
  );
}
