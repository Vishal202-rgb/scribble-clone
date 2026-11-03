import React from 'react';
import { Trophy, Crown, PenTool, CheckCircle } from 'lucide-react';
import { Player } from '../../types';

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

  return (
    <div className="flex flex-col bg-mono-white border border-mono-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-mono-border flex items-center justify-between bg-mono-light">
        <div className="flex items-center space-x-2">
          <Trophy size={16} className="text-mono-text" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-mono-text">
            Leaderboard
          </h3>
        </div>
        <span className="text-[11px] font-mono text-mono-secondary">
          {players.length} players
        </span>
      </div>

      {/* Players List */}
      <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto">
        {sortedPlayers.map((player, index) => {
          const isCurrentDrawer = player.id === currentDrawerId;
          const isSelf = player.id === currentUserId;
          const isFirst = index === 0 && player.score > 0;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                isSelf
                  ? 'bg-mono-light border-mono-text font-semibold'
                  : 'bg-mono-white border-mono-border hover:border-mono-secondary'
              }`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <span className="w-5 text-center font-mono font-bold text-mono-secondary text-[11px]">
                  #{index + 1}
                </span>

                <div className="truncate flex items-center space-x-1.5">
                  <span className="text-mono-text truncate max-w-[100px]">
                    {player.name}
                  </span>

                  {isFirst && (
                    <Crown size={12} className="text-mono-text shrink-0" />
                  )}

                  {isSelf && (
                    <span className="text-[9px] uppercase px-1 rounded bg-mono-border text-mono-text font-mono">
                      You
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {isCurrentDrawer && (
                  <span
                    title="Currently Drawing"
                    className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-mono-text text-mono-white text-[10px]"
                  >
                    <PenTool size={10} />
                    <span>Drawer</span>
                  </span>
                )}

                {player.hasGuessed && (
                  <span
                    title="Guessed this round"
                    className="flex items-center text-mono-text text-[10px]"
                  >
                    <CheckCircle size={13} />
                  </span>
                )}

                <span className="font-mono font-bold text-mono-text text-xs">
                  {player.score} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
