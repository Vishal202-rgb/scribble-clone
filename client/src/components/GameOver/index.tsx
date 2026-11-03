import React from 'react';
import { Trophy, Crown, RotateCcw, Home } from 'lucide-react';
import { GameOverData } from '../../types';

interface GameOverModalProps {
  data: GameOverData;
  isHost: boolean;
  onRestart: () => void;
  onLeave: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  data,
  isHost,
  onRestart,
  onLeave
}) => {
  const winner = data.winner;
  const sorted = [...data.leaderboard].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mono-text/50 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-mono-white border border-mono-text rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mono-text text-mono-white mx-auto shadow-md">
            <Trophy size={28} />
          </div>
          <h2 className="text-3xl font-black text-mono-text tracking-tight">
            Game Over!
          </h2>
          {winner ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center space-x-1.5 text-lg font-bold text-mono-text">
                <Crown size={20} className="text-mono-text" />
                <span>{winner.name} Wins!</span>
              </div>
              <p className="text-xs text-mono-secondary font-mono">
                Final Score: {winner.score} points
              </p>
            </div>
          ) : (
            <p className="text-xs text-mono-secondary">The match has ended.</p>
          )}
        </div>

        {/* Final Standings */}
        <div className="bg-mono-light border border-mono-border rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-mono-secondary mb-2">
            Final Standings
          </h4>
          {sorted.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                idx === 0
                  ? 'bg-mono-white border-mono-text shadow-xs'
                  : 'bg-mono-white border-mono-border text-mono-text'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-5 text-center font-mono text-mono-secondary">
                  #{idx + 1}
                </span>
                <span>{player.name}</span>
                {idx === 0 && <Crown size={14} className="text-mono-text" />}
              </div>
              <span className="font-mono">{player.score} pts</span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {isHost && (
            <button
              onClick={onRestart}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl border border-mono-text bg-mono-text text-mono-white font-semibold text-sm hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <RotateCcw size={16} />
              <span>Play Again</span>
            </button>
          )}

          <button
            onClick={onLeave}
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl border border-mono-border bg-mono-white text-mono-text font-semibold text-sm hover:border-mono-text hover:bg-mono-light transition-all cursor-pointer"
          >
            <Home size={16} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};
