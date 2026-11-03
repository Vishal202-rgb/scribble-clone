import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle2 } from 'lucide-react';
import { ChatMessage, Player } from '../../types';

interface ChatProps {
  messages: ChatMessage[];
  currentUser: Player | null;
  isDrawer: boolean;
  hasGuessed?: boolean;
  isDrawingPhase: boolean;
  onSendGuess: (text: string) => void;
  onSendChat: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  currentUser,
  isDrawer,
  hasGuessed,
  isDrawingPhase,
  onSendGuess,
  onSendChat
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    if (isDrawingPhase && !isDrawer && !hasGuessed) {
      onSendGuess(text);
    } else {
      onSendChat(text);
    }

    setInputText('');
  };

  const getPlaceholder = () => {
    if (!isDrawingPhase) return 'Type a message...';
    if (isDrawer) return 'You are drawing (guessing disabled)...';
    if (hasGuessed) return 'You guessed it! Chat with other guessers...';
    return 'Type your guess here...';
  };

  return (
    <div className="flex flex-col h-full bg-mono-white border border-mono-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-mono-border flex items-center justify-between bg-mono-light">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-mono-text" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-mono-text">
            Game Chat &amp; Guesses
          </h3>
        </div>
        {hasGuessed && (
          <div className="flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded bg-mono-text text-mono-white">
            <CheckCircle2 size={12} />
            <span className="text-[10px] uppercase">Guessed</span>
          </div>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[260px] max-h-[380px] text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-mono-secondary text-xs italic">
            No messages yet. Send a guess or message!
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.system) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded bg-mono-light border border-mono-border text-center font-medium text-mono-text text-[11px]"
                >
                  {msg.text}
                </div>
              );
            }

            const isSelf = msg.playerId === currentUser?.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-baseline space-x-1 mb-0.5">
                  <span className="font-bold text-[11px] text-mono-text">
                    {msg.playerName || 'Player'}
                  </span>
                  {msg.alreadyGuessed && (
                    <span className="text-[9px] uppercase px-1 rounded bg-mono-border text-mono-secondary">
                      Guessed
                    </span>
                  )}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-lg max-w-[85%] break-words ${
                    isSelf
                      ? 'bg-mono-text text-mono-white'
                      : 'bg-mono-light text-mono-text border border-mono-border'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-mono-border bg-mono-light flex items-center space-x-2">
        <input
          type="text"
          maxLength={100}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isDrawingPhase && isDrawer}
          className="flex-1 px-3 py-2 text-xs rounded-lg border border-mono-border bg-mono-white text-mono-text focus:outline-none focus:border-mono-text transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (isDrawingPhase && isDrawer)}
          className="p-2 rounded-lg bg-mono-text text-mono-white hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer shadow-xs"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
