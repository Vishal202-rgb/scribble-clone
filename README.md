# Skribbl.io Clone &mdash; Real-Time Multiplayer Drawing & Guessing Game

A full-stack, real-time multiplayer drawing and guessing game built with React, TypeScript, Vite, Node.js, Express, and Socket.IO. Designed with a strictly monochromatic, minimalist aesthetic.

---

## Live Demo & Deployment
- **Frontend URL (Vercel)**: `https://your-skribbl-clone.vercel.app` *(configured for instant deployment)*
- **Backend WebSocket URL (Render / Railway)**: `https://your-skribbl-clone.onrender.com`

---

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Bundler & Tooling**: Vite
- **Styling**: Tailwind CSS (Custom Monochromatic Palette)
- **Icons**: Lucide React
- **Networking**: `socket.io-client`
- **Canvas**: Native HTML5 Canvas API with normalized coordinate scaling ($800 \times 600$)

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **WebSockets**: Socket.IO
- **State Management**: In-Memory Maps (`RoomStore`) with Object-Oriented Domain Models (`Room`, `Game`, `Player`)

---

## Features

### 1. Multiplayer Room & Lobby Management
- **Instant Room Creation**: Host configures player capacity (2–20), rounds (2–10), and draw time (15–240s).
- **Easy Joining**: Join via unique 6-character room codes or shareable one-click invite links (`?room=CODE`).
- **Host Controls**: Host identification, dynamic host re-election if the host leaves, and lobby player status.
- **In-Memory Store**: Fast, persistent in-memory Map structure for managing active rooms and socket mappings.

### 2. Turn-Based Game Engine
- **Turn Rotation**: Cyclical drawer rotation ensuring each player draws once per round.
- **Word Selection**: Drawer picks 1 of 3 (configurable up to 5) categorized random words. Auto-picks if drawer times out.
- **Server Authoritative Timer**: Central countdown timer synchronized across all participants.
- **Round End & Game Over**: Detailed round summary with revealed words, round scores, next drawer announcements, and final winner podium.

### 3. Real-Time HTML5 Drawing Canvas
- **Fluid Freehand Drawing**: Low-latency stroke streaming using WebSockets.
- **Resolution-Independent Coordinates**: Drawing coordinates are normalized to an $800 \times 600$ coordinate space, ensuring precision across mobile, tablets, and desktop displays.
- **Monochromatic Drawing Tools**:
  - Ink Palette: Black (`#222222`), Dark Grey (`#555555`), Mid Grey (`#888888`), Light Grey (`#BBBBBB`), and White (`#FFFFFF`).
  - Brush Sizes: Small (3px), Medium (7px), Large (14px), and Extra Large (26px).
  - Dedicated Eraser tool.
  - Multi-step Undo: Restores stroke history across all clients.
  - Clear Canvas: Instant wipe with remote broadcast.
- **Role Permissions**: Only the designated drawer can draw; guessing players are locked in viewer mode.

### 4. Real-Time Chat & Guessing System
- **Case-Insensitive & Whitespace Trimming**: Robust word matching logic.
- **Anti-Cheat Word Secrecy**: The actual word remains exclusively on the server until the round finishes. Guessers receive only masked blanks (`_ _ _ _`).
- **Progressive Hint Reveals**: Server systematically reveals letters over time (e.g. `_ A _ E _`).
- **Dynamic Scoring**: Faster guesses earn higher scores (up to 500 pts). First correct guesser receives bonus points. Drawers earn reward points for every player who guesses correctly.
- **Near-Miss Feedback**: Informs guessers when their guess is within 1 character distance of the correct word.
- **Role Restrictions**: Drawers cannot guess; players who have already guessed correctly cannot leak the word in public chat.

---

## Folder Structure

```
skribbl-clone/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby/          # Lobby screen, player list & host controls
│   │   │   ├── GameCanvas/     # HTML5 Canvas, stroke sync & drawing tools
│   │   │   ├── Chat/           # Real-time chat & guessing stream
│   │   │   ├── Leaderboard/    # Live rankings, points & drawer badges
│   │   │   ├── GameTimer/      # Server timer, round indicator & masked hints
│   │   │   ├── WordModal/      # Drawer word picker modal
│   │   │   └── GameOver/       # Match conclusion & podium standings
│   │   ├── hooks/
│   │   │   └── useSocket.ts    # React hook for socket state & event dispatchers
│   │   ├── pages/
│   │   │   ├── HomePage.tsx    # Monochromatic landing page
│   │   │   ├── CreateRoomPage.tsx # Host settings
│   │   │   ├── JoinRoomPage.tsx # Room code entry
│   │   │   ├── LobbyPage.tsx   # Waiting room
│   │   │   └── GamePage.tsx    # Live game dashboard
│   │   ├── services/
│   │   │   └── socket.ts       # Socket.IO client initialization
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript data contracts
│   │   ├── App.tsx             # Root layout & view routing
│   │   ├── main.tsx
│   │   └── index.css           # Tailwind directives & monochromatic scrollbar
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js      # Monochromatic color definitions
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── socket/
│   │   │   ├── roomHandler.js    # create_room, join_room, player_joined, player_left
│   │   │   ├── gameHandler.js    # start_game, word_chosen
│   │   │   ├── drawingHandler.js # draw_start, draw_move, draw_end, canvas_clear, draw_undo
│   │   │   └── chatHandler.js    # guess, guess_result, chat, chat_message
│   │   ├── game/
│   │   │   ├── Room.js           # Room class
│   │   │   ├── Game.js           # Turn rotation, timer, scoring & hints
│   │   │   └── Player.js         # Player state & scores
│   │   ├── utils/
│   │   │   └── roomStore.js      # Map-based room registry & code generator
│   │   ├── words/
│   │   │   ├── wordList.json     # Categorized vocabulary
│   │   │   └── wordService.js    # Word selection & hint masking
│   │   └── server.js             # Express & Socket.IO server
│   └── package.json
├── README.md
└── architecture.md
```

---

## Local Setup & Run Instructions

### Prerequisites
- Node.js &ge; 18
- npm &ge; 9

### 1. Start the Backend Server
```bash
cd server
npm install
npm start
```
The backend server will run on `http://localhost:5000`.
Health endpoint: `http://localhost:5000/api/health`.

### 2. Start the Frontend Client
In a separate terminal window:
```bash
cd client
npm install
npm run dev
```
The Vite development server will start on `http://localhost:3000`.

### 3. Playing Multi-Tab Locally
1. Open `http://localhost:3000` in Tab 1, enter a nickname (e.g. `Alice`), and click **Create Room**.
2. Copy the 6-character room code or the invite link.
3. Open `http://localhost:3000` in Tab 2 and Tab 3, enter nicknames (e.g. `Bob`, `Charlie`), and join using the room code.
4. Alice (Host) clicks **Start Game**.
5. Drawer chooses a word and draws on canvas; guessers see masked blanks and type guesses into chat.

---

## Deployment Guide

### Deploying Backend to Render or Railway
1. Push repository to GitHub.
2. In Render / Railway, create a new **Web Service**.
3. Set the Root Directory to `server`.
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add Environment Variables:
   - `PORT`: `5000` (or provided automatically by the platform)
   - `CLIENT_ORIGIN`: Your frontend URL (or `*`)

### Deploying Frontend to Vercel
1. Import repository into Vercel.
2. Set Root Directory to `client`.
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Add Environment Variable:
   - `VITE_BACKEND_URL`: URL of your deployed backend (e.g. `https://your-backend.onrender.com`)

---

## Testing & Verification
The application has been verified against:
- [x] Multi-session room creation and joining.
- [x] Real-time stroke broadcasting and canvas clearing.
- [x] Turn rotation and word selection modal.
- [x] Progressive letter hint unlocks and countdown timer synchronization.
- [x] Case-insensitive guess evaluation and anti-cheat word masking.
- [x] Dynamic score allocation and live leaderboard ranking.
- [x] Player disconnection cleanup and automatic host re-election.
- [x] Strict monochromatic design scheme.
