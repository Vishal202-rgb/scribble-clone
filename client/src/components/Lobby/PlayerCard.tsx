import React from 'react';
import { Crown } from 'lucide-react';
import { Player } from '../../types';
import { Avatar, getSavedAvatar } from '../Avatar';

interface PlayerCardProps {
  player: Player;
  isSelf: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isSelf }) => {
  const savedAvatar = isSelf ? getSavedAvatar() : undefined;

  return (
    <div
      className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
        isSelf
          ? 'bg-sky-50/70 border-skribbl-blue shadow-xs'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        {/* Colorful Skribbl Avatar */}
        <Avatar
          config={savedAvatar}
          seed={player.id || player.name}
          size="md"
          animate
        />

        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-fun font-bold text-slate-800 text-sm truncate max-w-[130px]">
              {player.name}
            </span>
            {isSelf && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-skribbl-blue font-fun">
                You
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{player.isHost ? 'Room Leader' : 'Ready to draw'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {player.isHost && (
          <div
            title="Room Host"
            className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-700 shadow-xs"
          >
            <Crown size={12} className="stroke-[2.5] fill-amber-500" />
            <span className="text-[10px] uppercase tracking-wider font-fun">Host</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCard;
