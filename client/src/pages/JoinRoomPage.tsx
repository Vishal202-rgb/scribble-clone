import React, { useState, useEffect } from 'react';
import { ArrowLeft, LogIn, Hash, Sparkles } from 'lucide-react';
import { Avatar, getSavedAvatar } from '../components/Avatar';

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

  const savedAvatar = getSavedAvatar();

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
    <div className="w-full max-w-lg mx-auto space-y-5 py-2">
      {/* Back button */}
      <button
        onClick={onBack}
        type="button"
        className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-skribbl-blue transition-colors px-2 py-1 rounded-lg hover:bg-white"
      >
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>

      {/* Main Container */}
      <div className="bg-white border-2 border-skribbl-border rounded-3xl p-6 sm:p-8 shadow-skribbl space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 text-skribbl-blue flex items-center justify-center">
            <LogIn size={20} />
          </div>
          <div>
            <h2 className="text-xl font-fun font-bold text-slate-800">Join a Room</h2>
            <p className="text-xs text-slate-500">Enter the 6-character room code to join your friends.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Code */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-fun">
              Room Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Hash size={18} />
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
                className={`w-full pl-11 pr-4 py-3 font-mono text-lg font-black tracking-widest uppercase rounded-2xl border-2 text-slate-800 bg-slate-50 focus:bg-white transition-all focus:outline-none ${
                  fieldErrors.room
                    ? 'border-rose-400 ring-2 ring-rose-200'
                    : 'border-slate-200 focus:border-skribbl-blue focus:ring-4 focus:ring-sky-100'
                }`}
              />
            </div>
            {fieldErrors.room && (
              <p className="text-xs text-rose-600 font-bold mt-1">{fieldErrors.room}</p>
            )}
          </div>

          {/* Nickname & Avatar */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-fun">
              Your Nickname
            </label>
            <div className="flex items-center space-x-3">
              <Avatar config={savedAvatar} size="md" />
              <div className="flex-1">
                <input
                  type="text"
                  maxLength={16}
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Enter your name"
                  className={`w-full px-4 py-2.5 rounded-2xl border-2 text-slate-800 bg-slate-50 focus:bg-white text-sm font-semibold focus:outline-none transition-all ${
                    fieldErrors.name
                      ? 'border-rose-400 ring-2 ring-rose-200'
                      : 'border-slate-200 focus:border-skribbl-blue focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </div>
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-rose-600 font-bold mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-skribbl-blue hover:bg-skribbl-blueDark text-white font-fun font-bold text-base shadow-skribbl-btn hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed transition-all disabled:opacity-50 cursor-pointer border-b-4 border-skribbl-blueDark flex items-center justify-center space-x-2"
          >
            <Sparkles size={18} />
            <span>{isLoading ? 'Joining Room...' : 'Enter Room'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinRoomPage;
