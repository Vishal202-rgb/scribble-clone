# Skribbl Clone Architecture Overview

## 1. System Overview
The Skribbl Clone is a full-stack real-time multiplayer drawing and guessing game built with a modern, performant, and decoupled client-server architecture:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS (Strict monochromatic design token system).
- **Backend**: Node.js, Express, Socket.IO, Object-Oriented Domain Models (`Room`, `Game`, `Player`).
- **Communication Protocol**: Full-duplex WebSocket connections using Socket.IO with automatic fallback to polling.

---

## 2. Object-Oriented Server Architecture
The backend follows clean OOP principles to encapsulate room states, round state machines, and player lifecycles:

```
                      +-------------------+
                      |     RoomStore     |
                      |  (In-memory Map)  |
                      +---------+---------+
                                | 1..*
                                v
                      +-------------------+
                      |       Room        |
                      | - id (6-char code)|
                      | - hostId          |
                      | - settings        |
                      | - players: Map    |
                      +---------+---------+
                                |
             +------------------+------------------+
             | 1                                   | 1..*
             v                                     v
   +-------------------+                 +-------------------+
   |       Game        |                 |      Player       |
   | - currentRound    |                 | - id, socketId    |
   | - currentDrawerId |                 | - name, isHost    |
   | - currentWord     |                 | - score, hasGuessed|
   | - phase & timer   |                 | - isDrawing       |
   | - strokes history |                 +-------------------+
   +-------------------+
```

### Domain Models
1. **Player (`server/src/game/Player.js`)**:
   - Represents an active participant in a room.
   - Encapsulates score tallying, round score accumulation, guessing state, and drawer flags.
   - Provides `toPublicJSON()` serialization to strip sensitive socket connection details.

2. **Room (`server/src/game/Room.js`)**:
   - Manages room settings (max players: 2–20, rounds: 2–10, draw time: 15–240s, word options: 1–5, hints: 0–5).
   - Manages player membership in an in-memory Map.
   - Implements automatic host failover: if the host disconnects, leadership is smoothly promoted to the next joined player.
   - Handles player departure and room destruction when empty.

3. **Game (`server/src/game/Game.js`)**:
   - Implements the state machine for game rounds:
     `LOBBY` &rarr; `CHOOSING_WORD` &rarr; `DRAWING` &rarr; `ROUND_END` &rarr; `GAME_OVER`.
   - Manages server-authoritative countdown timers.
   - Tracks drawer turn rotation ensuring each player draws once per round.
   - Progressive hint reveal schedule: dynamically calculates timestamps during drawing to reveal masked letters without leaking full words.
   - Stroke buffer management for synchronization, undo, and clear operations.

4. **RoomStore (`server/src/utils/roomStore.js`)**:
   - Central in-memory registry of active rooms indexed by unique 6-character room codes.
   - Bi-directional socket-to-room mapping for $O(1)$ cleanup upon client disconnects.

---

## 3. Real-Time WebSocket Event Contract

The application implements the standard Socket.IO event protocol outlined in the specification:

### Room & Lobby Lifecycle
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `create_room` | Client &rarr; Server | `{ hostName, settings }` | Host creates a room with custom parameters |
| `join_room` | Client &rarr; Server | `{ roomId, playerName }` | Player joins room via 6-character code |
| `room_created` | Server &rarr; Client | `{ room, player }` | Emitted to host on successful room creation |
| `room_joined` | Server &rarr; Client | `{ room, player }` | Emitted to player on successful room join |
| `player_joined`| Server &rarr; Room | `{ player, players, room }` | Broadcast to all room members when a new player enters |
| `player_left` | Server &rarr; Room | `{ playerId, players, hostId, room }` | Broadcast to all remaining members when a player leaves |
| `leave_room` | Client &rarr; Server | `{ roomId, playerId }` | Explicit room exit by client |

### Game State & Flow
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `start_game` | Client &rarr; Server | `{}` | Host starts match (requires &ge; 2 players) |
| `round_start` | Server &rarr; Clients | `{ drawerId, drawerName, drawTime, round, totalRounds, wordOptions? }` | Starts round; `wordOptions` sent **only** to the designated drawer |
| `word_chosen` | Client &rarr; Server | `{ word }` | Drawer confirms word choice |
| `game_state` | Server &rarr; Clients | `{ phase, round, totalRounds, drawerId, hints, timeLeft, word? }` | Synchronizes round clock, masked blanks (`_ _ _ _`), and drawer word |
| `round_end` | Server &rarr; Clients | `{ word, scores, nextDrawer, reason }` | Announces revealed word and updated scores at round finish |
| `game_over` | Server &rarr; Clients | `{ winner, leaderboard }` | Match completion summary with podium rankings |

### Drawing Canvas Synchronization
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `draw_start` | Client &rarr; Server | `{ x, y, color, size }` | Drawer initiates stroke (normalized $800 \times 600$ coordinates) |
| `draw_move` | Client &rarr; Server | `{ x, y }` | Drawer streams continuous coordinate points |
| `draw_end` | Client &rarr; Server | `{}` | Drawer completes stroke path |
| `draw_data` | Server &rarr; Clients | `{ type: 'start' \| 'move' \| 'end', ... }` | Broadcast to all players in the room for real-time stroke reproduction |
| `canvas_clear`| Client &rarr; Server / Room | `{}` | Drawer clears drawing canvas; broadcast to all clients |
| `draw_undo` | Client &rarr; Server / Room | `{ strokes }` | Drawer pops last stroke; broadcasts refreshed stroke history |

### Chat & Guessing
| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `guess` | Client &rarr; Server | `{ text }` | Player submits word guess |
| `guess_result`| Server &rarr; Clients | `{ correct: true, playerId, playerName, points, leaderboard }` | Broadcast upon correct guess with points awarded |
| `chat` | Client &rarr; Server | `{ text }` | General chat message submission |
| `chat_message`| Server &rarr; Clients | `{ playerId, playerName, text, system?, alreadyGuessed? }` | Real-time chat stream distribution |

---

## 4. Security & Anti-Cheat Architecture

1. **Word Secrecy**:
   - The selected word is held in memory exclusively on the server.
   - Non-drawing clients receive only masked blanks (`_ _ _ _ _`) and progressively revealed letter hints.
   - Under no circumstances is the unmasked word emitted via `game_state` or `round_start` to guessing players.

2. **Role & Permission Validation**:
   - Drawing events (`draw_start`, `draw_move`, `draw_end`, `canvas_clear`, `draw_undo`) verify that the sending socket's player ID matches `currentDrawerId` and that the room is in the `DRAWING` phase.
   - Guess submissions from the current drawer are rejected.
   - Once a player has guessed the correct word, duplicate scoring is barred, and their subsequent messages are isolated to avoid leaking the answer to others.

3. **Input Sanitization**:
   - Nicknames and room codes are trimmed and bounded.
   - Guesses undergo normalized case-insensitive comparison and whitespace trimming.

---

## 5. UI/UX Design System (Strictly Monochromatic)
The entire user interface strictly follows a monochromatic design token system without gradients or non-monochrome accent colors:
- **Background**: `#FFFFFF` (Card surfaces) / `#F5F5F5` (Body backdrop)
- **Borders & Dividers**: `#E5E5E5`
- **Primary Text**: `#222222`
- **Secondary Text**: `#777777`
- **Drawing Ink Palette**: Monochrome shades (`#222222`, `#555555`, `#888888`, `#BBBBBB`, `#FFFFFF` for eraser).

---

## 6. Production Deployment Strategy
- **Frontend**: Configured for static hosting on **Vercel** or **Netlify** with client-side rewrites and `VITE_BACKEND_URL` environment variable support.
- **Backend**: Containerized/Node.js service deployed on **Render** or **Railway** with continuous WebSocket connectivity (`transports: ['websocket', 'polling']`).
