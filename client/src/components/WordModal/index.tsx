import React from 'react';
import { Sparkles, Clock } from 'lucide-react';

interface WordModalProps {
  words: string[];
  timeLeft: number;
  onSelectWord: (word: string) => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  words,
  timeLeft,
  onSelectWord
}) => {
  if (!words || words.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mono-text/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-mono-white border border-mono-text rounded-2xl p-6 shadow-2xl text-center space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-mono-light border border-mono-border text-xs font-mono text-mono-secondary mb-1">
            <Clock size={13} />
            <span>{timeLeft}s to pick</span>
          </div>
          <h2 className="text-2xl font-black text-mono-text tracking-tight">
            Choose a Word to Draw
          </h2>
          <p className="text-xs text-mono-secondary">
            Select one of the words below. If time runs out, one will be chosen automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {words.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onSelectWord(word)}
              className="w-full py-3.5 px-4 rounded-xl border border-mono-border bg-mono-light text-mono-text font-bold text-base hover:bg-mono-text hover:text-mono-white hover:border-mono-text transition-all duration-150 shadow-xs cursor-pointer capitalize flex items-center justify-center space-x-2"
            >
              <Sparkles size={16} />
              <span>{word}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
