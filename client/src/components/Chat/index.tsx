import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';
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
    if (!isDrawingPhase) return 'Chat with players...';
    if (isDrawer) return 'You are drawing (guessing disabled)...';
    if (hasGuessed) return 'You guessed it! Chat with other guessers...';
    return 'Type your guess here...';
  };

  return (
    <div className="flex flex-col h-full bg-white border-2 border-skribbl-border rounded-3xl shadow-skribbl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <MessageSquare size={16} className="text-skribbl-blue" />
          <h3 className="text-xs font-fun font-bold uppercase tracking-wider text-slate-700">
            Guesses &amp; Chat
          </h3>
        </div>
        {hasGuessed && (
          <div className="flex items-center space-x-1 text-xs font-fun font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300 animate-bounce">
            <CheckCircle2 size={13} />
            <span className="text-[10px] uppercase">Guessed!</span>
          </div>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-[260px] max-h-[380px] text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs italic py-8 space-y-1">
            <Sparkles size={20} className="text-slate-300" />
            <span>No guesses yet. Be the first to guess!</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isCorrectGuess =
              msg.system &&
              (msg.text.toLowerCase().includes('guessed the word') ||
                msg.text.toLowerCase().includes('correct'));

            const isCloseGuess =
              msg.system && msg.text.toLowerCase().includes('is close');

            if (isCorrectGuess) {
              return (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-center font-fun font-bold text-emerald-800 text-xs shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>{msg.text}</span>
                </div>
              );
            }

            if (isCloseGuess) {
              return (
                <div
                  key={msg.id}
                  className="p-2 rounded-2xl bg-amber-50 border border-amber-300 text-center font-fun font-bold text-amber-800 text-xs shadow-xs"
                >
                  {msg.text}
                </div>
              );
            }

            if (msg.system) {
              return (
                <div
                  key={msg.id}
                  className="p-1.5 rounded-xl bg-slate-100 text-center font-fun text-slate-500 text-[11px]"
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
                <div className="flex items-baseline space-x-1 mb-0.5 px-1">
                  <span className="font-fun font-bold text-[11px] text-slate-700">
                    {msg.playerName || 'Player'}
                  </span>
                  {msg.alreadyGuessed && (
                    <span className="text-[9px] font-fun uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                      Guessed
                    </span>
                  )}
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl max-w-[85%] break-words font-medium text-xs shadow-xs ${
                    isSelf
                      ? 'bg-skribbl-blue text-white rounded-tr-xs'
                      : 'bg-slate-100 text-slate-800 rounded-tl-xs border border-slate-200'
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center space-x-2">
        <input
          type="text"
          maxLength={100}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={getPlaceholder()}
          disabled={isDrawingPhase && isDrawer}
          className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-2xl border-2 border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-skribbl-blue focus:ring-2 focus:ring-sky-100 transition-all disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed placeholder:text-slate-400 placeholder:font-normal"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || (isDrawingPhase && isDrawer)}
          className="p-2.5 rounded-2xl bg-skribbl-blue hover:bg-skribbl-blueDark text-white disabled:opacity-40 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Send Guess or Message"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
};

export default Chat;
