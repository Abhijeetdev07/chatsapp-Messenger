'use client';

import { MessageCircle } from 'lucide-react';

export default function EmptyChat() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-background text-center px-6">
      <div className="w-20 h-20 rounded-3xl bg-primary-600/10 flex items-center justify-center mb-6">
        <MessageCircle className="w-10 h-10 text-primary-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-2">ChatUp</h2>
      <p className="text-foreground/50 max-w-sm">
        Select a conversation from the sidebar to start messaging, or search for a user to begin a new chat.
      </p>
    </div>
  );
}
