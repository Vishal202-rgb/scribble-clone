import React from 'react';

export interface AvatarConfig {
  colorIndex: number;
  eyesIndex: number;
  mouthIndex: number;
}

export const AVATAR_COLORS = [
  { name: 'Sky Blue', bg: '#38BDF8', border: '#0284C7', shadow: '#0369A1' },
  { name: 'Sunshine', bg: '#FBBF24', border: '#D97706', shadow: '#B45309' },
  { name: 'Lime Green', bg: '#4ADE80', border: '#16A34A', shadow: '#15803D' },
  { name: 'Coral Red', bg: '#F87171', border: '#DC2626', shadow: '#B91C1C' },
  { name: 'Purple', bg: '#A78BFA', border: '#7C3AED', shadow: '#6D28D9' },
  { name: 'Pink', bg: '#F472B6', border: '#DB2777', shadow: '#BE185D' },
  { name: 'Orange', bg: '#FB923C', border: '#EA580C', shadow: '#C2410C' },
  { name: 'Teal', bg: '#2DD4BF', border: '#0D9488', shadow: '#0F766E' }
];

export const TOTAL_EYES = 6;
export const TOTAL_MOUTHS = 6;
export const TOTAL_COLORS = AVATAR_COLORS.length;

const AVATAR_STORAGE_KEY = 'skribbl_avatar_config';

export function getSavedAvatar(): AvatarConfig {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.colorIndex === 'number' &&
        typeof parsed.eyesIndex === 'number' &&
        typeof parsed.mouthIndex === 'number'
      ) {
        return {
          colorIndex: Math.abs(parsed.colorIndex) % TOTAL_COLORS,
          eyesIndex: Math.abs(parsed.eyesIndex) % TOTAL_EYES,
          mouthIndex: Math.abs(parsed.mouthIndex) % TOTAL_MOUTHS
        };
      }
    }
  } catch (_) {}
  return { colorIndex: 0, eyesIndex: 0, mouthIndex: 0 };
}

export function saveAvatar(config: AvatarConfig): void {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(config));
  } catch (_) {}
}

/**
 * Deterministically derives an AvatarConfig from a player name/ID
 */
export function getDeterministicAvatar(seed: string): AvatarConfig {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const pos = Math.abs(hash);
  return {
    colorIndex: pos % TOTAL_COLORS,
    eyesIndex: (pos >> 3) % TOTAL_EYES,
    mouthIndex: (pos >> 6) % TOTAL_MOUTHS
  };
}

interface AvatarProps {
  config?: AvatarConfig;
  seed?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  animate?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32'
};

export const Avatar: React.FC<AvatarProps> = ({
  config,
  seed,
  size = 'md',
  className = '',
  animate = false
}) => {
  const effectiveConfig =
    config || (seed ? getDeterministicAvatar(seed) : { colorIndex: 0, eyesIndex: 0, mouthIndex: 0 });

  const color = AVATAR_COLORS[effectiveConfig.colorIndex % TOTAL_COLORS];
  const eyes = effectiveConfig.eyesIndex % TOTAL_EYES;
  const mouth = effectiveConfig.mouthIndex % TOTAL_MOUTHS;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${
        SIZE_MAP[size]
      } ${animate ? 'hover:scale-105 transition-transform duration-200' : ''} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Blob Body Shadow */}
        <circle cx="50" cy="54" r="44" fill={color.shadow} opacity="0.3" />

        {/* Blob Body */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill={color.bg}
          stroke={color.border}
          strokeWidth="4"
        />

        {/* Cute Head Highlight */}
        <ellipse cx="36" cy="24" rx="12" ry="6" fill="#FFFFFF" opacity="0.45" />

        {/* EYES */}
        {eyes === 0 && (
          // Classic big cute eyes with white shine
          <g>
            <ellipse cx="36" cy="46" rx="6" ry="8" fill="#1E293B" />
            <circle cx="34" cy="43" r="2.5" fill="#FFFFFF" />
            <ellipse cx="64" cy="46" rx="6" ry="8" fill="#1E293B" />
            <circle cx="62" cy="43" r="2.5" fill="#FFFFFF" />
          </g>
        )}

        {eyes === 1 && (
          // Happy arcs ^ ^
          <g stroke="#1E293B" strokeWidth="4.5" strokeLinecap="round" fill="none">
            <path d="M 28 48 Q 36 38 44 48" />
            <path d="M 56 48 Q 64 38 72 48" />
          </g>
        )}

        {eyes === 2 && (
          // Wink: left normal, right wink arc ;)
          <g>
            <ellipse cx="36" cy="46" rx="6" ry="8" fill="#1E293B" />
            <circle cx="34" cy="43" r="2.5" fill="#FFFFFF" />
            <path
              d="M 57 48 Q 65 54 73 48"
              stroke="#1E293B"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>
        )}

        {eyes === 3 && (
          // Cool sunglasses B)
          <g>
            <rect x="22" y="40" width="24" height="15" rx="5" fill="#1E293B" />
            <rect x="54" y="40" width="24" height="15" rx="5" fill="#1E293B" />
            <line x1="44" y1="45" x2="56" y2="45" stroke="#1E293B" strokeWidth="4" />
            <line x1="24" y1="43" x2="38" y2="43" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            <line x1="56" y1="43" x2="70" y2="43" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          </g>
        )}

        {eyes === 4 && (
          // Cute big glasses O-O
          <g stroke="#1E293B" strokeWidth="3" fill="none">
            <circle cx="36" cy="46" r="12" fill="#FFFFFF" fillOpacity="0.25" />
            <circle cx="64" cy="46" r="12" fill="#FFFFFF" fillOpacity="0.25" />
            <line x1="48" y1="46" x2="52" y2="46" strokeWidth="3" />
            <circle cx="36" cy="46" r="4.5" fill="#1E293B" />
            <circle cx="64" cy="46" r="4.5" fill="#1E293B" />
          </g>
        )}

        {eyes === 5 && (
          // Starry / Sparkle Eyes * *
          <g fill="#1E293B">
            <polygon points="36,36 39,44 47,44 41,49 43,57 36,52 29,57 31,49 25,44 33,44" />
            <polygon points="64,36 67,44 75,44 69,49 71,57 64,52 57,57 59,49 53,44 61,44" />
          </g>
        )}

        {/* CHEEKS / BLUSH */}
        <ellipse cx="23" cy="56" rx="5" ry="3" fill="#F43F5E" opacity="0.35" />
        <ellipse cx="77" cy="56" rx="5" ry="3" fill="#F43F5E" opacity="0.35" />

        {/* MOUTHS */}
        {mouth === 0 && (
          // Sweet gentle smile :)
          <path
            d="M 38 64 Q 50 74 62 64"
            stroke="#1E293B"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {mouth === 1 && (
          // Big laughing mouth with pink tongue :D
          <g>
            <path
              d="M 36 62 Q 50 82 64 62 Z"
              fill="#1E293B"
              stroke="#1E293B"
              strokeWidth="2"
            />
            <path
              d="M 43 70 Q 50 64 57 70 Q 50 80 43 70 Z"
              fill="#F472B6"
            />
          </g>
        )}

        {mouth === 2 && (
          // Tongue sticking out :P
          <g>
            <path
              d="M 37 63 Q 50 71 63 63"
              stroke="#1E293B"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 45 66 C 45 76 55 76 55 66 Z"
              fill="#F43F5E"
              stroke="#1E293B"
              strokeWidth="2"
            />
          </g>
        )}

        {mouth === 3 && (
          // Grin / Teeth :D
          <g>
            <rect x="36" y="62" width="28" height="9" rx="4.5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="3" />
            <line x1="45" y1="62" x2="45" y2="71" stroke="#1E293B" strokeWidth="2" />
            <line x1="55" y1="62" x2="55" y2="71" stroke="#1E293B" strokeWidth="2" />
          </g>
        )}

        {mouth === 4 && (
          // Cute 'O' surprised mouth :o
          <ellipse
            cx="50"
            cy="66"
            rx="5.5"
            ry="7.5"
            fill="#1E293B"
          />
        )}

        {mouth === 5 && (
          // Cat mouth :3
          <path
            d="M 38 64 Q 44 71 50 64 Q 56 71 62 64"
            stroke="#1E293B"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </div>
  );
};

export default Avatar;
