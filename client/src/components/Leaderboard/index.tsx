import React from 'react';
import { Trophy, Crown, PenTool, CheckCircle2 } from 'lucide-react';
import { Player } from '../../types';
import { Avatar, getSavedAvatar } from '../Avatar';

interface LeaderboardProps {
  players: Player[];
  currentDrawerId: string | null;
  currentUserId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentDrawerId,
  currentUserId
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const savedAvatar = getSavedAvatar();

  return (
    <div className="flex flex-col bg-white border-2 border-skribbl-border rounded-3xl shadow-skribbl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <Trophy size={16} className="text-amber-500" />
          <h3 className="text-xs font-fun font-bold uppercase tracking-wider text-slate-700">
            Leaderboard
          </h3>
        </div>
        <span className="text-[11px] font-fun font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
          {players.length} players
        </span>
      </div>

      {/* Players List */}
      <div className="p-2 space-y-2 max-h-[360px] overflow-y-auto">
        {sortedPlayers.map((player, index) => {
          const isCurrentDrawer = player.id === currentDrawerId;
          const isSelf = player.id === currentUserId;
          const isFirst = index === 0 && player.score > 0;

          // Rank styling
          let rankBadge = (
            <span className="w-5 text-center font-fun font-bold text-slate-400 text-xs">
              #{index + 1}
            </span>
          );
          if (index === 0 && player.score > 0) {
            rankBadge = <span className="text-sm">🥇</span>;
          } else if (index === 1 && player.score > 0) {
            rankBadge = <span className="text-sm">🥈</span>;
          } else if (index === 2 && player.score > 0) {
            rankBadge = <span className="text-sm">🥉</span>;
          }

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2.5 rounded-2xl border-2 text-xs transition-all ${
                player.hasGuessed
                  ? 'bg-emerald-50/80 border-emerald-300 shadow-xs'
                  : isSelf
                    ? 'bg-sky-50/70 border-skribbl-blue shadow-xs'
                    : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                {rankBadge}

                {/* Player Mini Avatar */}
                <Avatar
                  config={isSelf ? savedAvatar : undefined}
                  seed={player.id || player.name}
                  size="sm"
                />

                <div className="truncate flex items-center space-x-1.5 min-w-0">
                  <span className="font-fun font-bold text-slate-800 truncate max-w-[90px]">
                    {player.name}
                  </span>

                  {isFirst && (
                    <Crown size={13} className="text-amber-500 fill-amber-400 shrink-0" />
                  )}

                  {isSelf && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-sky-100 text-skribbl-blue font-fun font-bold shrink-0">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Status Tags & Score */}
              <div className="flex items-center space-x-1.5 shrink-0">
                {isCurrentDrawer && (
                  <span
                    title="Currently Drawing"
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-skribbl-blue text-white text-[10px] font-fun font-bold animate-pulse"
                  >
                    <PenTool size={10} />
                    <span>Drawer</span>
                  </span>
                )}

                {player.hasGuessed && (
                  <span
                    title="Guessed word correctly"
                    className="flex items-center text-emerald-600 text-[10px] font-fun font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full"
                  >
                    <CheckCircle2 size={12} className="mr-0.5" />
                    <span>Done</span>
                  </span>
                )}

                <span className="font-fun font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded-xl">
                  {player.score} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
