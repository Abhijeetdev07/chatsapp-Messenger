'use client';

interface MediaViewerProps {
  conversationId: string;
  initialMessageId: string;
  onClose: () => void;
}

export default function MediaViewer({ conversationId, initialMessageId, onClose }: MediaViewerProps) {
  void conversationId;
  void initialMessageId;
  void onClose;
  return null;
}
