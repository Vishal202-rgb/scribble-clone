import React, { useState } from 'react';
import { PlusCircle, LogIn, Wifi, WifiOff, Shuffle, ChevronLeft, ChevronRight, Palette, Eye, Smile, Sparkles } from 'lucide-react';
import {
  Avatar,
  AvatarConfig,
  getSavedAvatar,
  saveAvatar,
  TOTAL_COLORS,
  TOTAL_EYES,
  TOTAL_MOUTHS,
  AVATAR_COLORS
} from '../components/Avatar';

interface HomePageProps {
  nickname: string;
  onNicknameChange: (name: string) => void;
  onNavigate: (view: 'CREATE' | 'JOIN') => void;
  isConnected: boolean;
  errorMessage: string | null;
  onClearError: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  nickname,
  onNicknameChange,
  onNavigate,
  isConnected,
  errorMessage,
  onClearError
}) => {
  const [localName, setLocalName] = useState(nickname);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatar, setAvatar] = useState<AvatarConfig>(() => getSavedAvatar());

  const handleAction = (view: 'CREATE' | 'JOIN') => {
    const trimmed = localName.trim();
    if (!trimmed) {
      setNameError('Please choose a nickname to continue!');
      return;
    }
    setNameError(null);
    onNicknameChange(trimmed);
    onNavigate(view);
  };

  const updateAvatar = (partial: Partial<AvatarConfig>) => {
    setAvatar((prev) => {
      const updated = { ...prev, ...partial };
      saveAvatar(updated);
      return updated;
    });
  };

  const randomizeAvatar = () => {
    const randomized: AvatarConfig = {
      colorIndex: Math.floor(Math.random() * TOTAL_COLORS),
      eyesIndex: Math.floor(Math.random() * TOTAL_EYES),
      mouthIndex: Math.floor(Math.random() * TOTAL_MOUTHS)
    };
    setAvatar(randomized);
    saveAvatar(randomized);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 py-2">
      {/* Skribbl Header & Logo */}
      <div className="text-center space-y-3">
        {/* Connection status badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full text-xs font-medium border border-skribbl-blueBorder bg-white shadow-xs">
          {isConnected ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi size={13} className="text-emerald-600" />
              <span className="text-slate-700 font-semibold">Online &amp; Ready</span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <WifiOff size={13} className="text-amber-600" />
              <span className="text-slate-600 font-semibold">Connecting to server...</span>
            </>
          )}
        </div>

        {/* Playful Colorful Skribbl.io Logo */}
        <div className="flex items-center justify-center space-x-1 select-none">
          <span className="text-5xl sm:text-6xl font-fun font-bold text-amber-500 drop-shadow-sm transform -rotate-3 hover:rotate-0 transition-transform inline-block">
            s
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-sky-500 drop-shadow-sm transform rotate-2 hover:rotate-0 transition-transform inline-block">
            k
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-rose-500 drop-shadow-sm transform -rotate-2 hover:rotate-0 transition-transform inline-block">
            r
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-emerald-500 drop-shadow-sm transform rotate-3 hover:rotate-0 transition-transform inline-block">
            i
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-violet-500 drop-shadow-sm transform -rotate-1 hover:rotate-0 transition-transform inline-block">
            b
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-orange-500 drop-shadow-sm transform rotate-2 hover:rotate-0 transition-transform inline-block">
            b
          </span>
          <span className="text-5xl sm:text-6xl font-fun font-bold text-teal-500 drop-shadow-sm transform -rotate-2 hover:rotate-0 transition-transform inline-block">
            l
          </span>
          <span className="text-2xl sm:text-3xl font-fun font-bold text-slate-400 self-end mb-1">
            .io
          </span>
        </div>

        <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto">
          Free multiplayer drawing &amp; guessing game. Draw fast, guess first!
        </p>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl border-2 border-rose-300 bg-rose-50 text-rose-800 text-sm flex items-center justify-between shadow-sm animate-in fade-in">
          <span className="font-semibold">{errorMessage}</span>
          <button
            onClick={onClearError}
            type="button"
            className="text-xs uppercase font-bold tracking-wider ml-4 text-rose-600 hover:text-rose-900 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Player Customizer & Entrance Card */}
      <div className="bg-white border-2 border-skribbl-border rounded-3xl p-6 sm:p-8 shadow-skribbl space-y-6">
        {/* Avatar Customization Area */}
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-fun">
              Choose Your Character
            </span>
            <button
              type="button"
              onClick={randomizeAvatar}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-skribbl-blue hover:text-skribbl-blueDark bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              title="Randomize Avatar"
            >
              <Shuffle size={13} />
              <span>Randomize</span>
            </button>
          </div>

          {/* Big Interactive Avatar Display */}
          <div className="relative p-2 bg-gradient-to-b from-sky-50 to-slate-50 border-2 border-sky-100 rounded-3xl shadow-inner flex items-center justify-center">
            <Avatar config={avatar} size="2xl" animate />
          </div>

          {/* Avatar Controls: Color, Eyes, Mouth */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full pt-1">
            {/* Color Cycler */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    colorIndex: (avatar.colorIndex - 1 + TOTAL_COLORS) % TOTAL_COLORS
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Previous Color"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Palette size={13} className="text-slate-400" />
                <span>{AVATAR_COLORS[avatar.colorIndex].name}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    colorIndex: (avatar.colorIndex + 1) % TOTAL_COLORS
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Next Color"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Eyes Cycler */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    eyesIndex: (avatar.eyesIndex - 1 + TOTAL_EYES) % TOTAL_EYES
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Previous Eyes"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Eye size={13} className="text-slate-400" />
                <span>Eyes {avatar.eyesIndex + 1}/{TOTAL_EYES}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    eyesIndex: (avatar.eyesIndex + 1) % TOTAL_EYES
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Next Eyes"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Mouth Cycler */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    mouthIndex: (avatar.mouthIndex - 1 + TOTAL_MOUTHS) % TOTAL_MOUTHS
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Previous Mouth"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                <Smile size={13} className="text-slate-400" />
                <span>Mouth {avatar.mouthIndex + 1}/{TOTAL_MOUTHS}</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateAvatar({
                    mouthIndex: (avatar.mouthIndex + 1) % TOTAL_MOUTHS
                  })
                }
                className="p-1 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors"
                title="Next Mouth"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Nickname Input Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 font-fun">
            Your Nickname
          </label>
          <div className="relative">
            <input
              type="text"
              maxLength={16}
              value={localName}
              onChange={(e) => {
                setLocalName(e.target.value);
                if (nameError) setNameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAction('CREATE');
              }}
              placeholder="Enter your name (e.g. Leonardo)"
              className={`w-full px-5 py-3.5 rounded-2xl border-2 text-slate-800 bg-slate-50 focus:bg-white text-base font-semibold focus:outline-none transition-all placeholder:text-slate-400 ${
                nameError
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/50'
                  : 'border-slate-200 focus:border-skribbl-blue focus:ring-4 focus:ring-sky-100'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
              {localName.length}/16
            </span>
          </div>
          {nameError && (
            <p className="text-xs text-rose-600 font-bold mt-1 flex items-center space-x-1">
              <span>⚠️</span>
              <span>{nameError}</span>
            </p>
          )}
        </div>

        {/* Action Buttons: Create Room & Join Room */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          <button
            onClick={() => handleAction('CREATE')}
            type="button"
            disabled={!isConnected}
            className="flex items-center justify-center space-x-2.5 py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-fun font-bold text-base shadow-skribbl-btn hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-b-4 border-emerald-700"
          >
            <PlusCircle size={20} className="stroke-[2.5]" />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => handleAction('JOIN')}
            type="button"
            disabled={!isConnected}
            className="flex items-center justify-center space-x-2.5 py-4 px-6 rounded-2xl bg-skribbl-blue hover:bg-skribbl-blueDark text-white font-fun font-bold text-base shadow-skribbl-btn hover:shadow-skribbl-hover active:translate-y-1 active:shadow-skribbl-btn-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-b-4 border-skribbl-blueDark"
          >
            <LogIn size={20} className="stroke-[2.5]" />
            <span>Join Room</span>
          </button>
        </div>
      </div>

      {/* Feature Showcase Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1 shadow-xs hover:border-sky-300 transition-colors">
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-1">
            <Sparkles size={16} />
          </div>
          <div className="font-bold text-slate-800 font-fun text-sm">Instant Rooms</div>
          <div className="text-slate-500">Quick 6-letter room codes &amp; shareable invite links.</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-1">
            <Palette size={16} />
          </div>
          <div className="font-bold text-slate-800 font-fun text-sm">14-Color Palette</div>
          <div className="text-slate-500">Freehand brushes, geometric shapes &amp; eraser.</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center space-y-1 shadow-xs hover:border-sky-300 transition-colors">
          <div className="w-8 h-8 rounded-full bg-sky-100 text-skribbl-blue flex items-center justify-center mx-auto mb-1">
            <Wifi size={16} />
          </div>
          <div className="font-bold text-slate-800 font-fun text-sm">Real-Time Sync</div>
          <div className="text-slate-500">Fast Socket.IO stream with responsive multiplayer canvas.</div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
