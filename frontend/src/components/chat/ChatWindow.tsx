'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConversationStore } from '@/store/useConversationStore';
import { Message } from '@/store/useMessageStore';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import EmptyChat from './EmptyChat';
import ConversationInfoPanel from './ConversationInfoPanel';
import SearchInChat from './SearchInChat';

export default function ChatWindow() {
  const { activeConversationId, conversations } = useConversationStore();
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeConversation = activeConversationId
    ? conversations.find((c) => c._id === activeConversationId)
    : null;

  // Reset state when conversation changes
  useEffect(() => {
    setShowInfoPanel(false);
    setShowSearch(false);
    setReplyTo(null);
    setHighlightedMessageId(null);
    setSearchQuery('');
  }, [activeConversationId]);

  const handleHighlightChange = useCallback((messageId: string | null, query: string) => {
    setHighlightedMessageId(messageId);
    setSearchQuery(query);
  }, []);

  if (!activeConversation) {
    return <EmptyChat />;
  }

  return (
    <div className="flex-1 relative h-full min-w-0">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <ChatHeader
          conversation={activeConversation}
          onToggleInfo={() => setShowInfoPanel((v) => !v)}
          onToggleSearch={() => setShowSearch((v) => !v)}
        />

        {/* Search bar (below header) */}
        {showSearch && (
          <SearchInChat
            conversationId={activeConversation._id}
            onClose={() => { setShowSearch(false); setHighlightedMessageId(null); setSearchQuery(''); }}
            onHighlightChange={handleHighlightChange}
          />
        )}

        <MessageList
          conversationId={activeConversation._id}
          onReply={(msg) => setReplyTo(msg)}
          highlightedMessageId={highlightedMessageId}
          searchQuery={searchQuery}
        />
        <MessageInput
          conversationId={activeConversation._id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>

      {/* Info Panel */}
      {showInfoPanel && (
        <div className="absolute inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close info panel"
            onClick={() => setShowInfoPanel(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full md:w-[360px]">
            <ConversationInfoPanel
              conversation={activeConversation}
              onClose={() => setShowInfoPanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
