import React from 'react';
import { Clock, Eye, Sparkles } from 'lucide-react';
import { GamePhase } from '../../types';

interface GameTimerProps {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  timeLeft: number;
  hints: string;
  isDrawer: boolean;
  drawerWord?: string;
}

export const GameTimer: React.FC<GameTimerProps> = ({
  phase,
  round,
  totalRounds,
  timeLeft,
  hints,
  isDrawer,
  drawerWord
}) => {
  const displayWord = isDrawer && drawerWord ? drawerWord.toUpperCase() : hints;
  const letterCount = isDrawer && drawerWord ? drawerWord.length : hints.replace(/\s+/g, '').length;

  const isUrgent = timeLeft <= 10 && phase === 'DRAWING';
  const isWarning = timeLeft > 10 && timeLeft <= 20 && phase === 'DRAWING';

  return (
    <div className="bg-white border-2 border-skribbl-border rounded-3xl p-3.5 sm:p-4 shadow-skribbl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 select-none">
      {/* Left: Round Badge */}
      <div className="flex items-center space-x-2.5">
        <div className="px-3.5 py-1.5 rounded-2xl bg-sky-50 border border-skribbl-blueBorder text-xs font-fun font-bold text-skribbl-blue shadow-xs">
          Round {round} / {totalRounds}
        </div>

        <div className="text-xs font-bold font-fun text-slate-400 hidden md:block">
          {phase === 'CHOOSING_WORD' && '🤔 Selecting word...'}
          {phase === 'DRAWING' && (isDrawer ? '🎨 Draw your masterpiece!' : '🔍 Guess what is being drawn!')}
          {phase === 'ROUND_END' && '🎉 Round over!'}
          {phase === 'GAME_OVER' && '🏆 Match completed!'}
        </div>
      </div>

      {/* Center: Word Blanks / Drawer Word */}
      <div className="flex flex-col items-center justify-center">
        {phase === 'DRAWING' ? (
          <div className="flex flex-col items-center">
            {isDrawer ? (
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-fun font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider flex items-center space-x-1">
                  <Eye size={12} />
                  <span>Word</span>
                </span>
                <span className="font-fun text-xl sm:text-2xl font-bold tracking-wider text-slate-800">
                  {displayWord}
                </span>
                <span className="text-xs text-slate-400 font-bold font-fun">
                  ({letterCount} letters)
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-2xl sm:text-3xl font-black tracking-[0.3em] text-slate-800 drop-shadow-xs">
                    {displayWord}
                  </span>
                </div>
                {hints && (
                  <span className="text-[11px] font-bold font-fun text-slate-400 mt-0.5">
                    {letterCount} letters
                  </span>
                )}
              </div>
            )}
          </div>
        ) : phase === 'CHOOSING_WORD' ? (
          <div className="flex items-center space-x-2 text-sm font-fun font-bold text-slate-500 animate-pulse">
            <Sparkles size={16} className="text-amber-500" />
            <span>Drawer is choosing a word...</span>
          </div>
        ) : (
          <span className="text-sm font-fun font-bold text-slate-500">
            {phase === 'ROUND_END' ? 'Round Finished' : 'Waiting...'}
          </span>
        )}
      </div>

      {/* Right: Big Colorful Countdown Clock */}
      <div className="flex items-center space-x-2 shrink-0">
        <div
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl font-mono font-black text-sm border-2 transition-all shadow-xs ${
            isUrgent
              ? 'bg-rose-500 text-white border-rose-600 animate-pulse scale-105'
              : isWarning
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-sky-50 text-slate-700 border-skribbl-blueBorder'
          }`}
        >
          <Clock size={16} className={isUrgent ? 'animate-spin' : ''} />
          <span>{timeLeft}s</span>
        </div>
      </div>
    </div>
  );
};

export default GameTimer;
