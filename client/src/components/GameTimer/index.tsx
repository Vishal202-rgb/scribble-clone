import React from 'react';
import { Clock, HelpCircle, Eye } from 'lucide-react';
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

  return (
    <div className="bg-mono-white border border-mono-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Left: Round Info */}
      <div className="flex items-center space-x-3">
        <div className="px-2.5 py-1 rounded-lg bg-mono-light border border-mono-border text-xs font-mono font-bold text-mono-text">
          Round {round}/{totalRounds}
        </div>

        <div className="text-xs text-mono-secondary hidden sm:block">
          {phase === 'CHOOSING_WORD' && 'Choosing a word...'}
          {phase === 'DRAWING' && (isDrawer ? 'Draw the word below!' : 'Guess the word!')}
          {phase === 'ROUND_END' && 'Round ended!'}
          {phase === 'GAME_OVER' && 'Game completed!'}
        </div>
      </div>

      {/* Center: Word Blanks / Hints Display */}
      <div className="flex flex-col items-center">
        {phase === 'DRAWING' ? (
          <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2">
              {isDrawer ? (
                <Eye size={16} className="text-mono-text" />
              ) : (
                <HelpCircle size={16} className="text-mono-secondary" />
              )}
              <span className="font-mono text-xl sm:text-2xl font-black tracking-[0.25em] text-mono-text">
                {displayWord}
              </span>
            </div>
            {!isDrawer && hints && (
              <span className="text-[10px] text-mono-secondary mt-0.5">
                {hints.replace(/\s+/g, '').length} letters
              </span>
            )}
          </div>
        ) : phase === 'CHOOSING_WORD' ? (
          <span className="text-sm font-semibold text-mono-secondary animate-pulse">
            Drawer is selecting a word...
          </span>
        ) : (
          <span className="text-sm font-semibold text-mono-secondary">
            {phase === 'ROUND_END' ? 'Round Finished' : 'Waiting...'}
          </span>
        )}
      </div>

      {/* Right: Server Countdown Timer */}
      <div className="flex items-center space-x-2 shrink-0">
        <div
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-mono font-bold text-sm transition-all ${
            timeLeft <= 10 && phase === 'DRAWING'
              ? 'bg-mono-text text-mono-white border-mono-text animate-pulse'
              : 'bg-mono-light text-mono-text border-mono-border'
          }`}
        >
          <Clock size={15} />
          <span>{timeLeft}s</span>
        </div>
      </div>
    </div>
  );
};
