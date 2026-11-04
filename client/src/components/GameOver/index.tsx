import React from 'react';
import { Trophy, Crown, RotateCcw, Home, Sparkles } from 'lucide-react';
import { GameOverData } from '../../types';
import { Avatar } from '../Avatar';

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

  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-300 select-none overflow-y-auto">
      <div className="w-full max-w-lg bg-white border-4 border-skribbl-blue rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 my-auto animate-in zoom-in-95 duration-200">
        {/* Title & Celebration */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-xs font-fun font-bold text-amber-800 mb-1">
            <Trophy size={14} className="text-amber-600" />
            <span>Match Complete</span>
          </div>
          <h2 className="text-3xl font-fun font-black text-slate-800 tracking-tight">
            Game Over!
          </h2>
          {winner && (
            <p className="text-sm font-fun font-bold text-emerald-600 flex items-center justify-center space-x-1.5">
              <Sparkles size={16} />
              <span>Congratulations to {winner.name}!</span>
            </p>
          )}
        </div>

        {/* Olympic Podium (1st Center, 2nd Left, 3rd Right) */}
        {first && (
          <div className="pt-4 pb-2">
            <div className="flex items-end justify-center gap-2 sm:gap-3 max-w-sm mx-auto">
              {/* 2nd Place (Left) */}
              {second && (
                <div className="flex flex-col items-center flex-1">
                  <div className="relative mb-1">
                    <Avatar seed={second.id || second.name} size="md" />
                    <span className="absolute -top-2 -right-1 text-base">🥈</span>
                  </div>
                  <span className="font-fun font-bold text-xs text-slate-700 truncate max-w-[80px]">
                    {second.name}
                  </span>
                  <span className="text-[11px] font-fun font-bold text-slate-400 mb-1">
                    {second.score} pts
                  </span>
                  <div className="w-full h-16 bg-gradient-to-t from-slate-200 to-slate-100 border-2 border-slate-300 rounded-t-2xl flex items-center justify-center text-slate-600 font-fun font-black text-lg shadow-inner">
                    2
                  </div>
                </div>
              )}

              {/* 1st Place (Center - Tallest) */}
              <div className="flex flex-col items-center flex-1 z-10">
                <div className="relative mb-1">
                  <Crown size={22} className="text-amber-500 fill-amber-400 mx-auto -mb-1 animate-bounce" />
                  <Avatar seed={first.id || first.name} size="lg" animate />
                  <span className="absolute -top-1 -right-1 text-lg">🥇</span>
                </div>
                <span className="font-fun font-black text-sm text-slate-800 truncate max-w-[90px]">
                  {first.name}
                </span>
                <span className="text-xs font-fun font-bold text-amber-600 mb-1">
                  {first.score} pts
                </span>
                <div className="w-full h-24 bg-gradient-to-t from-amber-300 to-yellow-200 border-2 border-amber-400 rounded-t-2xl flex items-center justify-center text-amber-800 font-fun font-black text-2xl shadow-inner">
                  1
                </div>
              </div>

              {/* 3rd Place (Right) */}
              {third && (
                <div className="flex flex-col items-center flex-1">
                  <div className="relative mb-1">
                    <Avatar seed={third.id || third.name} size="md" />
                    <span className="absolute -top-2 -right-1 text-base">🥉</span>
                  </div>
                  <span className="font-fun font-bold text-xs text-slate-700 truncate max-w-[80px]">
                    {third.name}
                  </span>
                  <span className="text-[11px] font-fun font-bold text-slate-400 mb-1">
                    {third.score} pts
                  </span>
                  <div className="w-full h-12 bg-gradient-to-t from-amber-100 to-orange-50 border-2 border-amber-200 rounded-t-2xl flex items-center justify-center text-amber-700 font-fun font-black text-base shadow-inner">
                    3
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Scoreboard Table */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-3.5 space-y-2 max-h-48 overflow-y-auto">
          <div className="text-[11px] font-fun font-bold uppercase tracking-wider text-slate-400 text-left px-1">
            Full Scoreboard
          </div>
          {sorted.map((player, idx) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border-2 text-xs font-fun font-bold transition-all ${
                idx === 0
                  ? 'bg-amber-50/80 border-amber-300 text-slate-800 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="w-5 text-center font-bold text-slate-400">
                  #{idx + 1}
                </span>
                <Avatar seed={player.id || player.name} size="xs" />
                <span>{player.name}</span>
                {idx === 0 && <Crown size={14} className="text-amber-500 fill-amber-400" />}
              </div>
              <span className="font-bold text-slate-800">{player.score} pts</span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
          {isHost && (
            <button
              onClick={onRestart}
              type="button"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-fun font-bold text-sm shadow-skribbl-btn border-b-4 border-emerald-700 hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed transition-all cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>Play Again</span>
            </button>
          )}

          <button
            onClick={onLeave}
            type="button"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 font-fun font-bold text-sm transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Home size={16} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
