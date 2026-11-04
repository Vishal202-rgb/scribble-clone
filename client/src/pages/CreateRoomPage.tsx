import React, { useState } from 'react';
import { ArrowLeft, Sliders, Users, Clock, RotateCcw, Sparkles } from 'lucide-react';
import { RoomSettings } from '../types';
import { Avatar, getSavedAvatar } from '../components/Avatar';

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

  const savedAvatar = getSavedAvatar();

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
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-xl font-fun font-bold text-slate-800">Create Private Room</h2>
            <p className="text-xs text-slate-500">Configure your match settings and invite friends.</p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Host Nickname & Avatar Preview */}
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
                  value={hostName}
                  onChange={(e) => {
                    setHostName(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  placeholder="Enter your name"
                  className={`w-full px-4 py-2.5 rounded-2xl border-2 text-slate-800 bg-slate-50 focus:bg-white text-sm font-semibold focus:outline-none transition-all ${
                    nameError
                      ? 'border-rose-400 ring-2 ring-rose-200'
                      : 'border-slate-200 focus:border-skribbl-blue focus:ring-4 focus:ring-sky-100'
                  }`}
                />
              </div>
            </div>
            {nameError && (
              <p className="text-xs text-rose-600 font-bold mt-1">{nameError}</p>
            )}
          </div>

          {/* Max Players Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 font-fun">
                <Users size={16} className="text-skribbl-blue" />
                <span>Player Limit</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-skribbl-blue font-mono">
                {maxPlayers} Players
              </span>
            </div>

            {/* Quick Pills */}
            <div className="grid grid-cols-5 gap-1.5">
              {[4, 6, 8, 12, 16].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMaxPlayers(num)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    maxPlayers === num
                      ? 'bg-skribbl-blue text-white border-skribbl-blueDark shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={2}
              max={20}
              step={1}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-skribbl-blue cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Rounds Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 font-fun">
                <RotateCcw size={16} className="text-amber-500" />
                <span>Rounds</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-amber-600 font-mono">
                {rounds} Rounds
              </span>
            </div>

            {/* Quick Pills */}
            <div className="grid grid-cols-5 gap-1.5">
              {[2, 3, 4, 5, 8].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRounds(num)}
                  className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    rounds === num
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Draw Time Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 font-fun">
                <Clock size={16} className="text-emerald-500" />
                <span>Draw Time</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-emerald-600 font-mono">
                {drawTime} seconds
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { time: 30, label: '30s', desc: 'Fast' },
                { time: 60, label: '60s', desc: 'Quick' },
                { time: 80, label: '80s', desc: 'Default' },
                { time: 120, label: '120s', desc: 'Relaxed' }
              ].map((opt) => (
                <button
                  key={opt.time}
                  type="button"
                  onClick={() => setDrawTime(opt.time)}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center cursor-pointer ${
                    drawTime === opt.time
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-[10px] font-normal ${drawTime === opt.time ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-fun font-bold text-base shadow-skribbl-btn hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed transition-all disabled:opacity-50 cursor-pointer border-b-4 border-emerald-700 flex items-center justify-center space-x-2"
          >
            <Sparkles size={18} />
            <span>{isLoading ? 'Creating Room...' : 'Create &amp; Enter Lobby'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomPage;
