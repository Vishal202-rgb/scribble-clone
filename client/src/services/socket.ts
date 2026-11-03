import { io, Socket } from 'socket.io-client';

function resolveBackendUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_URL;

  // 1. If explicit environment variable is defined, normalize and use it
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. In local development on localhost/127.0.0.1, fallback to port 5000
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      import.meta.env.DEV)
  ) {
    return 'http://localhost:5000';
  }

  // 3. In production with no VITE_BACKEND_URL configured
  if (typeof window !== 'undefined' && import.meta.env.PROD) {
    console.warn(
      '[Socket.IO] VITE_BACKEND_URL is not set in your production environment.\n' +
      'Please set VITE_BACKEND_URL in your Vercel Project Settings to your deployed Render URL (e.g. https://your-service.onrender.com).'
    );
  }

  return '';
}

const BACKEND_URL = resolveBackendUrl();

export const socket: Socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ['websocket', 'polling'],
  withCredentials: true
});
