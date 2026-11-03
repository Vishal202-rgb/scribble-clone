import React, { useState } from 'react';
import { PlusCircle, LogIn, Wifi, WifiOff } from 'lucide-react';

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

  const handleAction = (view: 'CREATE' | 'JOIN') => {
    const trimmed = localName.trim();
    if (!trimmed) {
      setNameError('Please choose a nickname to continue.');
      return;
    }
    setNameError(null);
    onNicknameChange(trimmed);
    onNavigate(view);
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Title & Status */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono border border-mono-border bg-mono-white mb-2">
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-mono-text animate-pulse" />
              <Wifi size={12} className="text-mono-text" />
              <span className="text-mono-text">Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-mono-secondary" />
              <WifiOff size={12} className="text-mono-secondary" />
              <span className="text-mono-secondary">Connecting...</span>
            </>
          )}
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-mono-text">
          SKRIBBL
        </h1>
        <p className="text-sm text-mono-secondary max-w-sm mx-auto">
          Minimalist real-time multiplayer drawing and guessing game.
        </p>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-mono-text bg-mono-white text-mono-text text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={onClearError}
            type="button"
            className="text-xs uppercase font-mono tracking-wider ml-4 underline text-mono-secondary hover:text-mono-text"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Nickname Input Card */}
      <div className="bg-mono-white border border-mono-border rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mono-secondary mb-2">
            Your Nickname
          </label>
          <input
            type="text"
            maxLength={20}
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              if (nameError) setNameError(null);
            }}
            placeholder="Enter your name (e.g. Picasso)"
            className={`w-full px-4 py-3 rounded-lg border text-mono-text bg-mono-light focus:outline-none focus:bg-mono-white transition-all text-base ${
              nameError
                ? 'border-mono-text ring-1 ring-mono-text'
                : 'border-mono-border focus:border-mono-text'
            }`}
          />
          {nameError && (
            <p className="text-xs text-mono-text mt-1.5 font-medium">{nameError}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleAction('CREATE')}
            type="button"
            disabled={!isConnected}
            className="flex items-center justify-center space-x-2.5 p-4 rounded-lg border border-mono-text bg-mono-text text-mono-white font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <PlusCircle size={18} />
            <span>Create Room</span>
          </button>

          <button
            onClick={() => handleAction('JOIN')}
            type="button"
            disabled={!isConnected}
            className="flex items-center justify-center space-x-2.5 p-4 rounded-lg border border-mono-border bg-mono-white text-mono-text font-semibold text-sm hover:border-mono-text hover:bg-mono-light transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <LogIn size={18} />
            <span>Join Room</span>
          </button>
        </div>
      </div>

      {/* Feature Information Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-mono-white border border-mono-border rounded-lg p-3 text-center space-y-1">
          <div className="font-bold text-mono-text">Instant Rooms</div>
          <div className="text-mono-secondary">Create or share 6-character room codes.</div>
        </div>
        <div className="bg-mono-white border border-mono-border rounded-lg p-3 text-center space-y-1">
          <div className="font-bold text-mono-text">Real-Time Sync</div>
          <div className="text-mono-secondary">Low-latency WebSocket room management.</div>
        </div>
        <div className="bg-mono-white border border-mono-border rounded-lg p-3 text-center space-y-1">
          <div className="font-bold text-mono-text">Configurable</div>
          <div className="text-mono-secondary">Customize player count, rounds, & time.</div>
        </div>
      </div>
    </div>
  );
};
