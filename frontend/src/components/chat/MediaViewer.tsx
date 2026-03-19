'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useMessageStore, Message } from '@/store/useMessageStore';

interface MediaViewerProps {
  conversationId: string;
  initialMessageId: string;
  onClose: () => void;
}

export default function MediaViewer({ conversationId, initialMessageId, onClose }: MediaViewerProps) {
  const messages = useMessageStore((s) => s.messages[conversationId] || []);

  // Filter to only media messages (images & videos)
  const mediaMessages = messages.filter(
    (m) => (m.type === 'image' || m.type === 'video') && m.mediaUrl && !m.deletedForEveryone
  );

  // Find the starting index
  const initialIndex = mediaMessages.findIndex((m) => m._id === initialMessageId);
  const [currentIndex, setCurrentIndex] = useState(Math.max(initialIndex, 0));
  const [zoom, setZoom] = useState(1);

  const currentMedia = mediaMessages[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mediaMessages.length - 1;
  const counter = `${currentIndex + 1} / ${mediaMessages.length}`;

  // Navigate
  const goNext = useCallback(() => {
    if (hasNext) { setCurrentIndex((i) => i + 1); setZoom(1); }
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (hasPrev) { setCurrentIndex((i) => i - 1); setZoom(1); }
  }, [hasPrev]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Download handler
  const handleDownload = async () => {
    if (!currentMedia?.mediaUrl) return;
    try {
      const response = await fetch(currentMedia.mediaUrl);
      const blob = await response.blob();
      const ext = currentMedia.type === 'video' ? 'mp4' : 'jpg';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatup_media_${currentMedia._id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(currentMedia.mediaUrl, '_blank');
    }
  };

  // Zoom controls (images only)
  const toggleZoom = () => setZoom((z) => z === 1 ? 2 : 1);

  if (!currentMedia) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="text-white/60 text-sm font-medium">{counter}</span>
        </div>

        <div className="flex items-center gap-1">
          {currentMedia.type === 'image' && (
            <button
              onClick={toggleZoom}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title={zoom > 1 ? 'Zoom out' : 'Zoom in'}
            >
              {zoom > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-4 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Media */}
        <div className="flex items-center justify-center w-full h-full px-16">
          {currentMedia.type === 'image' ? (
            <img
              key={currentMedia._id}
              src={currentMedia.mediaUrl}
              alt="Media"
              className="max-h-[85vh] max-w-full object-contain rounded-lg transition-transform duration-300 select-none"
              style={{ transform: `scale(${zoom})`, cursor: zoom > 1 ? 'zoom-out' : 'zoom-in' }}
              onClick={toggleZoom}
              draggable={false}
            />
          ) : (
            <video
              key={currentMedia._id}
              src={currentMedia.mediaUrl}
              controls
              autoPlay
              className="max-h-[85vh] max-w-full rounded-lg"
            />
          )}
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-4 z-10 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {mediaMessages.length > 1 && (
        <div className="px-4 py-3 bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-xl mx-auto">
            {mediaMessages.map((m, i) => (
              <button
                key={m._id}
                onClick={() => { setCurrentIndex(i); setZoom(1); }}
                className={`
                  w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all
                  ${i === currentIndex ? 'border-primary-500 opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-75'}
                `}
              >
                {m.type === 'image' ? (
                  <img src={m.mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center">
                    <span className="text-[10px] text-foreground/50">▶</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
