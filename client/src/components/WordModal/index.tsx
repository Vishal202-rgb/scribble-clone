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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-md bg-white border-4 border-skribbl-blue rounded-3xl p-6 sm:p-7 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-fun font-bold text-amber-800 mb-1">
            <Clock size={13} />
            <span>{timeLeft}s to choose</span>
          </div>
          <h2 className="text-2xl font-fun font-bold text-slate-800 tracking-tight">
            Choose a Word to Draw!
          </h2>
          <p className="text-xs font-medium text-slate-500">
            Pick your secret word. Other players will try to guess it!
          </p>
        </div>

        {/* Word Choices Buttons */}
        <div className="grid grid-cols-1 gap-3">
          {words.map((word, idx) => {
            const colors = [
              'hover:bg-sky-500 hover:border-sky-600',
              'hover:bg-emerald-500 hover:border-emerald-600',
              'hover:bg-amber-500 hover:border-amber-600'
            ];
            const hoverColor = colors[idx % colors.length];

            return (
              <button
                key={word}
                type="button"
                onClick={() => onSelectWord(word)}
                className={`w-full py-4 px-5 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-800 font-fun font-bold text-lg ${hoverColor} hover:text-white hover:shadow-skribbl-btn active:translate-y-1 transition-all duration-150 cursor-pointer capitalize flex items-center justify-center space-x-2`}
              >
                <Sparkles size={18} />
                <span>{word}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WordModal;
