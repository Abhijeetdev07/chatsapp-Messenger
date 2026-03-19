'use client';

import { Video, Phone, PhoneOff } from 'lucide-react';
import { useCallStore } from '@/store/useCallStore';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Avatar } from '@/components/ui/Avatar';

export default function IncomingCallModal() {
  const { activeCall, callStatus } = useCallStore();
  const { answerCall, rejectCall } = useWebRTC();
  const modalRef = useFocusTrap(!!activeCall && activeCall.isIncoming && callStatus === 'ringing') as any;

  // Only show when there is an active incoming call that is ringing
  if (!activeCall || !activeCall.isIncoming || callStatus !== 'ringing') return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="incoming-call-title"
        className="bg-surface border border-border rounded-3xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center shadow-2xl animate-slide-up"
      >
        {/* Caller Avatar */}
        <div className="mb-4 animate-pulse ring-4 ring-primary-500/30 rounded-full">
          <Avatar 
            src={activeCall.callerInfo?.avatar} 
            fallback={activeCall.callerInfo?.username || '?'} 
            size="2xl" 
            className="bg-primary-600 border-none w-24 h-24 text-4xl" 
          />
        </div>
        
        {/* Caller Info */}
        <h2 id="incoming-call-title" className="text-2xl font-bold text-foreground mb-1">
          {activeCall.callerInfo?.username || 'Incoming Call'}
        </h2>
        <p className="text-foreground/60 mb-8 flex items-center gap-2">
          {activeCall.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          Incoming {activeCall.type} call
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-8 w-full justify-center">
          {/* Reject */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={rejectCall}
              aria-label="Decline call"
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30 hover:scale-105"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-medium text-foreground/50">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={answerCall}
              aria-label="Accept call"
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 animate-bounce"
            >
              {activeCall.type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
            <span className="text-xs font-medium text-foreground/50">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
}
