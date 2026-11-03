import React, { useState } from 'react';
import { Copy, Check, LogOut, Play, Users, Clock, RotateCcw, Link as LinkIcon, Shield } from 'lucide-react';
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

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Top Banner / Room Header */}
      <div className="bg-mono-white border border-mono-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-mono-secondary text-xs uppercase tracking-wider font-semibold">
              <Shield size={14} />
              <span>Room Lobby</span>
            </div>
            <div className="flex items-baseline space-x-3 mt-1">
              <span className="text-3xl font-mono font-bold tracking-widest text-mono-text">
                {room.roomId}
              </span>
              <span className="text-xs text-mono-secondary">
                ({room.players.length}/{room.settings.maxPlayers} players)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyCode}
              type="button"
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-mono-border bg-mono-light text-mono-text hover:bg-mono-border transition-colors"
            >
              {copiedCode ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={copyInviteLink}
              type="button"
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-mono-border bg-mono-light text-mono-text hover:bg-mono-border transition-colors"
            >
              {copiedLink ? <Check size={14} /> : <LinkIcon size={14} />}
              <span>{copiedLink ? 'Copied Link!' : 'Invite Link'}</span>
            </button>

            <button
              onClick={onLeave}
              type="button"
              className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-mono-border bg-mono-white text-mono-secondary hover:text-mono-text hover:border-mono-text transition-colors"
            >
              <LogOut size={14} />
              <span>Leave Room</span>
            </button>
          </div>
        </div>

        {/* Room Settings Badges */}
        <div className="mt-6 pt-4 border-t border-mono-border flex flex-wrap gap-4 text-xs text-mono-secondary">
          <div className="flex items-center space-x-1.5">
            <RotateCcw size={14} />
            <span>
              <strong className="text-mono-text">{room.settings.rounds}</strong> Rounds
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock size={14} />
            <span>
              <strong className="text-mono-text">{room.settings.drawTime}s</strong> Draw Time
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Users size={14} />
            <span>
              Max <strong className="text-mono-text">{room.settings.maxPlayers}</strong> Players
            </span>
          </div>
        </div>
      </div>

      {/* Main Content: Player List */}
      <div className="bg-mono-white border border-mono-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-mono-border">
          <div className="flex items-center space-x-2">
            <Users size={18} className="text-mono-text" />
            <h2 className="text-lg font-bold text-mono-text">Players in Room</h2>
          </div>
          <span className="text-xs font-medium px-2 py-1 rounded bg-mono-light border border-mono-border text-mono-secondary">
            {room.players.length} connected
          </span>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {room.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelf={player.id === currentUser?.id}
            />
          ))}
        </div>

        {/* Notice for waiting */}
        {room.players.length < 2 && (
          <div className="mt-6 p-4 rounded-lg bg-mono-light border border-mono-border text-center">
            <p className="text-sm text-mono-secondary">
              Waiting for other players to join using room code{' '}
              <strong className="text-mono-text font-mono">{room.roomId}</strong> or the invite link.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="bg-mono-white border border-mono-border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-mono-secondary text-center sm:text-left">
          {isHost ? (
            canStart ? (
              <span className="text-mono-text font-medium">
                You are the host. You can now start the game when all players are ready.
              </span>
            ) : (
              <span>You need at least 2 players in the lobby to start the game.</span>
            )
          ) : (
            <span>Waiting for the host to start the game...</span>
          )}
        </div>

        {isHost && (
          <button
            onClick={onStartGame}
            disabled={!canStart}
            type="button"
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              canStart
                ? 'bg-mono-text text-mono-white hover:opacity-90 cursor-pointer shadow-sm'
                : 'bg-mono-border text-mono-secondary cursor-not-allowed opacity-60'
            }`}
          >
            <Play size={16} />
            <span>Start Game</span>
          </button>
        )}
      </div>
    </div>
  );
};
