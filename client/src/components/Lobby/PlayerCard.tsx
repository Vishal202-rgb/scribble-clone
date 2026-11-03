import React from 'react';
import { Crown, User } from 'lucide-react';
import { Player } from '../../types';

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isSelf }) => {
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        isSelf
          ? 'bg-mono-white border-mono-text shadow-sm'
          : 'bg-mono-light border-mono-border hover:border-mono-secondary'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border ${
            player.isHost
              ? 'bg-mono-text text-mono-white border-mono-text'
              : 'bg-mono-white text-mono-text border-mono-border'
          }`}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-mono-text text-sm truncate max-w-[140px]">
              {player.name}
            </span>
            {isSelf && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-mono-border text-mono-text font-medium">
                You
              </span>
            )}
          </div>
          <span className="text-xs text-mono-secondary">
            {player.isHost ? 'Room Host' : 'Player'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {player.isHost ? (
          <div
            title="Room Host"
            className="flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded bg-mono-text text-mono-white"
          >
            <Crown size={12} className="stroke-[2.5]" />
            <span className="text-[11px] uppercase tracking-wider">Host</span>
          </div>
        ) : (
          <div className="text-mono-secondary p-1">
            <User size={16} />
          </div>
        )}
      </div>
    </div>
  );
};
