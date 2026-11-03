import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogIn, Hash } from 'lucide-react';

interface JoinRoomPageProps {
  initialNickname: string;
  initialRoomCode?: string;
  onBack: () => void;
  onJoin: (roomId: string, playerName: string) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export const JoinRoomPage: React.FC<JoinRoomPageProps> = ({
  initialNickname,
  initialRoomCode = '',
  onBack,
  onJoin,
  isLoading,
  errorMessage
}) => {
  const [playerName, setPlayerName] = useState(initialNickname);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; room?: string }>({});

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode.toUpperCase());
    }
  }, [initialRoomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { name?: string; room?: string } = {};

    const trimmedName = playerName.trim();
    const trimmedRoom = roomCode.trim().toUpperCase();

    if (!trimmedName) {
      errors.name = 'Please enter your nickname.';
    }
    if (!trimmedRoom) {
      errors.room = 'Please enter the room code.';
    } else if (trimmedRoom.length < 4) {
      errors.room = 'Room code should be at least 4 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    onJoin(trimmedRoom, trimmedName);
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
          <LogIn size={20} className="text-mono-text" />
          <h2 className="text-xl font-bold text-mono-text">Join Existing Room</h2>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg border border-mono-text bg-mono-light text-mono-text text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room Code */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mono-secondary mb-2">
              Room Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mono-secondary">
                <Hash size={16} />
              </div>
              <input
                type="text"
                maxLength={6}
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase());
                  if (fieldErrors.room) setFieldErrors((prev) => ({ ...prev, room: undefined }));
                }}
                placeholder="e.g. 8AB3X9"
                className={`w-full pl-10 pr-4 py-2.5 font-mono text-base font-bold tracking-widest uppercase rounded-lg border text-mono-text bg-mono-light focus:outline-none focus:bg-mono-white transition-all ${
                  fieldErrors.room
                    ? 'border-mono-text ring-1 ring-mono-text'
                    : 'border-mono-border focus:border-mono-text'
                }`}
              />
            </div>
            {fieldErrors.room && (
              <p className="text-xs text-mono-text mt-1 font-medium">{fieldErrors.room}</p>
            )}
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mono-secondary mb-2">
              Your Nickname
            </label>
            <input
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Enter your name"
              className={`w-full px-4 py-2.5 rounded-lg border text-mono-text bg-mono-light focus:outline-none focus:bg-mono-white text-sm transition-all ${
                fieldErrors.name
                  ? 'border-mono-text ring-1 ring-mono-text'
                  : 'border-mono-border focus:border-mono-text'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-mono-text mt-1 font-medium">{fieldErrors.name}</p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg border border-mono-text bg-mono-text text-mono-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isLoading ? 'Joining Room...' : 'Join Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
