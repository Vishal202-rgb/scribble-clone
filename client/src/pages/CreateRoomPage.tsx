import React, { useState } from 'react';
import { ArrowLeft, Sliders, Users, Clock, RotateCcw } from 'lucide-react';
import { RoomSettings } from '../types';

interface CreateRoomPageProps {
  initialNickname: string;
  onBack: () => void;
  onCreate: (hostName: string, settings: Partial<RoomSettings>) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const CreateRoomPage: React.FC<CreateRoomPageProps> = ({
  initialNickname,
  onBack,
  onCreate,
  isLoading,
  errorMessage
}) => {
  const [hostName, setHostName] = useState(initialNickname);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [nameError, setNameError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = hostName.trim();
    if (!trimmed) {
      setNameError('Host name is required.');
      return;
    }
    onCreate(trimmed, {
      maxPlayers,
      rounds,
      drawTime
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <button
        onClick={onBack}
        type="button"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-mono-secondary hover:text-mono-text transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Back to Home</span>
      </button>

      <div className="bg-mono-white border border-mono-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center space-x-2 border-b border-mono-border pb-4">
          <Sliders size={20} className="text-mono-text" />
          <h2 className="text-xl font-bold text-mono-text">Room Configuration</h2>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg border border-mono-text bg-mono-light text-mono-text text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Host Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mono-secondary mb-2">
              Your Nickname
            </label>
            <input
              type="text"
              maxLength={20}
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                if (nameError) setNameError(null);
              }}
              placeholder="Enter your name"
              className={`w-full px-4 py-2.5 rounded-lg border text-mono-text bg-mono-light focus:outline-none focus:bg-mono-white text-sm transition-all ${
                nameError
                  ? 'border-mono-text ring-1 ring-mono-text'
                  : 'border-mono-border focus:border-mono-text'
              }`}
            />
            {nameError && (
              <p className="text-xs text-mono-text mt-1 font-medium">{nameError}</p>
            )}
          </div>

          {/* Max Players */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-mono-secondary">
                <Users size={14} />
                <span>Max Players</span>
              </label>
              <span className="font-mono text-sm font-bold text-mono-text">
                {maxPlayers}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-mono-text cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-mono-secondary mt-1">
              <span>2</span>
              <span>8</span>
              <span>20</span>
            </div>
          </div>

          {/* Rounds */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-mono-secondary">
                <RotateCcw size={14} />
                <span>Number of Rounds</span>
              </label>
              <span className="font-mono text-sm font-bold text-mono-text">
                {rounds}
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-mono-text cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-mono-secondary mt-1">
              <span>2 rounds</span>
              <span>5 rounds</span>
              <span>10 rounds</span>
            </div>
          </div>

          {/* Draw Time */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-mono-secondary">
                <Clock size={14} />
                <span>Draw Time (seconds)</span>
              </label>
              <span className="font-mono text-sm font-bold text-mono-text">
                {drawTime}s
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 80, 120].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => setDrawTime(seconds)}
                  className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                    drawTime === seconds
                      ? 'bg-mono-text text-mono-white border-mono-text'
                      : 'bg-mono-light text-mono-text border-mono-border hover:border-mono-text'
                  }`}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg border border-mono-text bg-mono-text text-mono-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? 'Creating Room...' : 'Create Room & Go to Lobby'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
