import React, { useState } from 'react';
import { Copy, Check, LogOut, Play, Users, Clock, RotateCcw, Link as LinkIcon, Sparkles } from 'lucide-react';
import { RoomData, Player } from '../../types';
import { PlayerCard } from './PlayerCard';

interface LobbyProps {
  room: RoomData;
  currentUser: Player | null;
  onLeave: () => void;
  onStartGame: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  currentUser,
  onLeave,
  onStartGame
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = currentUser?.id === room.hostId || currentUser?.isHost;
  const canStart = isHost && room.players.length >= 2;

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}?room=${room.roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Create empty slots up to maxPlayers (clamped at 8 for visual cleanliness)
  const displaySlots = Math.min(room.settings.maxPlayers, 8);
  const emptySlotsCount = Math.max(0, displaySlots - room.players.length);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-2">
      {/* Top Banner / Room Code Card */}
      <div className="bg-white border-2 border-skribbl-border rounded-3xl p-6 sm:p-7 shadow-skribbl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-fun">
              Game Room Lobby
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-1.5 rounded-2xl bg-sky-50 border-2 border-skribbl-blueBorder text-skribbl-blue font-mono text-3xl font-black tracking-widest shadow-inner">
                {room.roomId}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-fun">
                {room.players.length} / {room.settings.maxPlayers} Players
              </span>
            </div>
          </div>

          {/* Action Chips: Copy Code, Invite Link, Leave */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={copyCode}
              type="button"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-sky-50 hover:bg-sky-100 text-skribbl-blue border border-skribbl-blueBorder transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {copiedCode ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={copyInviteLink}
              type="button"
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {copiedLink ? <Check size={15} className="text-emerald-600" /> : <LinkIcon size={15} />}
              <span>{copiedLink ? 'Copied Link!' : 'Invite Link'}</span>
            </button>

            <button
              onClick={onLeave}
              type="button"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 text-xs font-bold rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <LogOut size={15} />
              <span>Leave</span>
            </button>
          </div>
        </div>

        {/* Room Settings Badges */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <RotateCcw size={14} className="text-amber-500" />
            <span>
              <strong className="text-slate-800 font-bold">{room.settings.rounds}</strong> Rounds
            </span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Clock size={14} className="text-emerald-500" />
            <span>
              <strong className="text-slate-800 font-bold">{room.settings.drawTime}s</strong> Draw Time
            </span>
          </div>
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
            <Users size={14} className="text-skribbl-blue" />
            <span>
              Max <strong className="text-slate-800 font-bold">{room.settings.maxPlayers}</strong> Players
            </span>
          </div>
        </div>
      </div>

      {/* Players List Grid */}
      <div className="bg-white border-2 border-skribbl-border rounded-3xl p-6 sm:p-7 shadow-skribbl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users size={20} className="text-skribbl-blue" />
            <h2 className="text-lg font-fun font-bold text-slate-800">Players in Lobby</h2>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-fun">
            {room.players.length} connected
          </span>
        </div>

        {/* Player Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {room.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelf={player.id === currentUser?.id}
            />
          ))}

          {/* Empty Slot Placeholders */}
          {Array.from({ length: emptySlotsCount }).map((_, i) => (
            <div
              key={`empty_${i}`}
              className="flex items-center space-x-3 p-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400 select-none"
            >
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-xs font-bold text-slate-300">
                ?
              </div>
              <div className="text-xs font-fun font-semibold">
                Waiting for player...
              </div>
            </div>
          ))}
        </div>

        {/* Helper message if alone */}
        {room.players.length < 2 && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs text-amber-800 font-medium">
            Share room code <strong className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">{room.roomId}</strong> or send the invite link to start playing with friends!
          </div>
        )}
      </div>

      {/* Action Footer: Start Game */}
      <div className="bg-white border-2 border-skribbl-border rounded-3xl p-5 sm:p-6 shadow-skribbl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-slate-500 text-center sm:text-left">
          {isHost ? (
            canStart ? (
              <span className="text-emerald-700 font-bold flex items-center space-x-1.5">
                <Sparkles size={16} />
                <span>Everyone is ready! Click Start Game to begin round 1.</span>
              </span>
            ) : (
              <span className="text-slate-600 font-medium">
                At least 2 players are required to start the match.
              </span>
            )
          ) : (
            <span className="text-slate-600 font-medium flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping inline-block" />
              <span>Waiting for the room leader to launch the match...</span>
            </span>
          )}
        </div>

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            type="button"
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2.5 px-8 py-3.5 rounded-2xl text-base font-fun font-bold transition-all shadow-skribbl-btn border-b-4 ${
              canStart
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700 hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed cursor-pointer'
                : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-75'
            }`}
          >
            <Play size={18} className="fill-current" />
            <span>Start Game</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Lobby;
