import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { registerRoomHandler } from './socket/roomHandler.js';
import { registerGameHandler } from './socket/gameHandler.js';
import { registerDrawingHandler } from './socket/drawingHandler.js';
import { registerChatHandler } from './socket/chatHandler.js';
import { roomStore } from './utils/roomStore.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Enable trust proxy for cloud environments like Render
app.set('trust proxy', 1);

// Configurable PORT from environment variable (Render sets process.env.PORT automatically)
const RAW_PORT = process.env.PORT || 5000;
const PORT = Number.parseInt(String(RAW_PORT), 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

if (Number.isNaN(PORT) || PORT < 1 || PORT > 65535) {
  console.error(`❌ Invalid PORT specified: "${RAW_PORT}". Must be between 1 and 65535.`);
  process.exit(1);
}

// Parse allowed client origins from environment
// Supports comma-separated origins, wildcards (e.g. *.vercel.app), or wildcard '*'
const rawClientOrigin = process.env.CLIENT_ORIGIN || '*';
const allowedOriginsList = rawClientOrigin
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

/**
 * Validates incoming HTTP/WebSocket origin against configured allowed origins
 */
function isOriginAllowed(origin) {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server health checks)
  if (!origin) return true;

  // Wildcard allowed
  if (rawClientOrigin === '*' || allowedOriginsList.includes('*')) {
    return true;
  }

  // Exact match
  if (allowedOriginsList.includes(origin)) {
    return true;
  }

  // Match glob/wildcard patterns (e.g. https://skribbl-clone-*.vercel.app or *.vercel.app)
  const matchesWildcard = allowedOriginsList.some((allowed) => {
    if (!allowed.includes('*')) return false;
    const escaped = allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i').test(origin);
  });

  if (matchesWildcard) return true;

  // Always allow localhost in non-production development
  if (NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Request origin "${origin}" not allowed by CLIENT_ORIGIN: ${rawClientOrigin}`);
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Health & Status endpoints for Render & monitoring
app.get('/', (req, res) => {
  res.json({
    name: 'Skribbl Clone API',
    status: 'online',
    environment: NODE_ENV,
    activeRooms: roomStore.getAllRoomsCount(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: NODE_ENV,
    port: PORT,
    timestamp: new Date().toISOString(),
    activeRooms: roomStore.getAllRoomsCount()
  });
});

app.get('/api/rooms/:roomId', (req, res) => {
  const room = roomStore.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  return res.json({ room: room.toPublicJSON() });
});

// Socket.IO configuration with production-ready transports and CORS
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(`[Socket CORS Blocked] Origin "${origin}" rejected.`);
        callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 30000,
  pingInterval: 25000,
  connectTimeout: 45000
});

// Socket.IO event registration
io.on('connection', (socket) => {
  console.log(`[Socket Connected] Socket ID: ${socket.id} (Transport: ${socket.conn.transport.name})`);

  registerRoomHandler(io, socket);
  registerGameHandler(io, socket);
  registerDrawingHandler(io, socket);
  registerChatHandler(io, socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Socket Disconnected] Socket ID: ${socket.id} (Reason: ${reason})`);
  });
});

// Error handling for HTTP server (prevents unhandled EADDRINUSE crashes)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    let occupyingProcessInfo = '';
    try {
      if (process.platform === 'win32') {
        const netstatOutput = execSync(`netstat -ano | findstr :${PORT}`, { encoding: 'utf8', timeout: 2000 });
        const lines = netstatOutput.trim().split('\n');
        const listeningLine = lines.find((l) => l.includes('LISTENING') || l.includes('Listen'));
        if (listeningLine) {
          const parts = listeningLine.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          occupyingProcessInfo = `\nActive Listener PID: ${pid}`;
          try {
            const tasklist = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8', timeout: 2000 });
            const procName = tasklist.split(',')[0]?.replace(/"/g, '');
            if (procName) {
              occupyingProcessInfo += ` (${procName.trim()})`;
            }
          } catch (_) {}
        }
      }
    } catch (_) {
      // ignore inspection failures
    }

    console.error('\n============================================================');
    console.error(`❌ PORT CONFLICT ERROR: Port ${PORT} is already in use.`);
    console.error('============================================================');
    console.error(`Another process is already listening on port ${PORT}.${occupyingProcessInfo}`);
    console.error('This typically happens if a previous instance of the server');
    console.error('is still running in another terminal or background task.\n');
    console.error('How to resolve safely without affecting other applications:');
    console.error('1. Find the process using port ' + PORT + ':');
    console.error(`   PowerShell: Get-NetTCPConnection -LocalPort ${PORT} | Select-Object OwningProcess`);
    console.error(`   CMD:        netstat -ano | findstr :${PORT}`);
    console.error('\n2. Stop that process:');
    console.error('   PowerShell: Stop-Process -Id <PID> -Force');
    console.error('   CMD:        taskkill /PID <PID> /F');
    console.error('\n3. Note: The server port remains strictly ' + PORT + ' for local development.');
    console.error('============================================================\n');
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
});

// Idempotent graceful shutdown handling
let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down server gracefully...`);

  // 1. Clear all background game and room timers/intervals
  try {
    roomStore.clearAll();
  } catch (err) {
    // ignore
  }

  // 2. Disconnect all connected Socket.IO sockets and close Socket.IO
  try {
    if (io) {
      if (typeof io.disconnectSockets === 'function') {
        io.disconnectSockets(true);
      }
      io.close();
    }
  } catch (err) {
    // ignore
  }

  // 3. Immediately close all TCP connections and idle sockets
  try {
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  } catch (err) {
    // ignore
  }

  // 4. Close the HTTP server
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    } else {
      console.log(`HTTP/WebSocket server closed. Port ${PORT} released.`);
      process.exit(0);
    }
  });

  // 5. Fail-safe timeout to force process exit if server.close hangs
  const forceExitTimeout = setTimeout(() => {
    console.warn(`[Shutdown Timeout] Force closing process after 1500ms.`);
    process.exit(0);
  }, 1500);
  forceExitTimeout.unref();
}

// Signal handlers
['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'].forEach((sig) => {
  try {
    process.on(sig, () => handleShutdown(sig));
  } catch (err) {
    // SIGBREAK may not be available on all platforms
  }
});

server.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(`  Skribbl Clone Server running on ${HOST}:${PORT}`);
  console.log(`  Environment: ${NODE_ENV}`);
  console.log(`  Allowed Origins: ${rawClientOrigin}`);
  console.log(`  Healthcheck: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/api/health`);
  console.log(`===============================================`);
});

export { app, server, io };
