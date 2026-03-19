'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useMessageStore, Message } from '@/store/useMessageStore';

interface SearchInChatProps {
  conversationId: string;
  onClose: () => void;
  onHighlightChange: (messageId: string | null, query: string) => void;
}

export default function SearchInChat({ conversationId, onClose, onHighlightChange }: SearchInChatProps) {
  const messages = useMessageStore((s) => s.messages[conversationId] || []);
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Find matching messages
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return messages
      .filter((m) => m.content && !m.deletedForEveryone && m.content.toLowerCase().includes(q))
      .reverse(); // Most recent first
  }, [messages, query]);

  const matchCount = matches.length;

  // Notify parent of current highlighted message whenever it changes
  useEffect(() => {
    if (matchCount > 0 && activeMatchIndex < matchCount) {
      onHighlightChange(matches[activeMatchIndex]._id, query);
    } else {
      onHighlightChange(null, query);
    }
  }, [activeMatchIndex, matchCount, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset active index when matches change
  useEffect(() => {
    setActiveMatchIndex(0);
  }, [matchCount]);

  // Navigation
  const goNext = useCallback(() => {
    if (matchCount > 0) {
      setActiveMatchIndex((i) => (i + 1) % matchCount);
    }
  }, [matchCount]);

  const goPrev = useCallback(() => {
    if (matchCount > 0) {
      setActiveMatchIndex((i) => (i - 1 + matchCount) % matchCount);
    }
  }, [matchCount]);

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) goPrev();
      else goNext();
    }
  };

  const handleClose = () => {
    onHighlightChange(null, '');
    onClose();
  };

  return (
    <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-2 animate-slide-down">
      {/* Search icon */}
      <Search className="w-4 h-4 text-foreground/30 flex-shrink-0" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        placeholder="Search in conversation..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
      />

      {/* Match counter */}
      {query.trim() && (
        <span className="text-xs text-foreground/40 flex-shrink-0 min-w-[50px] text-right">
          {matchCount > 0
            ? `${activeMatchIndex + 1} of ${matchCount}`
            : 'No results'
          }
        </span>
      )}

      {/* Navigation arrows */}
      {matchCount > 1 && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={goPrev}
            className="p-1 rounded hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="p-1 rounded hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
            title="Next match (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Close */}
      <button
        onClick={handleClose}
        className="p-1 rounded hover:bg-surface-hover text-foreground/50 hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
