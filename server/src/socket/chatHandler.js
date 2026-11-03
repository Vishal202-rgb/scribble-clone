import { roomStore } from '../utils/roomStore.js';

/**
 * Handles real-time chat and guessing submissions
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerChatHandler(io, socket) {
  /**
   * Handle player guess
   * Payload: { text: string }
   */
  socket.on('guess', (payload = {}, callback) => {
    try {
      const mapping = roomStore.getSocketMapping(socket.id);
      if (!mapping) return;

      const room = roomStore.getRoom(mapping.roomId);
      if (!room) return;

      const player = room.getPlayer(mapping.playerId);
      if (!player) return;

      const rawText = (payload.text || '').trim();
      if (!rawText) return;

      // If game is not currently running or not in DRAWING phase, treat as normal chat
      if (!room.game || room.game.phase !== 'DRAWING') {
        io.to(room.id).emit('chat_message', {
          playerId: player.id,
          playerName: player.name,
          text: rawText
        });
        if (typeof callback === 'function') callback({ success: true, isGuess: false });
        return;
      }

      // If drawer attempts to guess
      if (player.id === room.game.currentDrawerId) {
        socket.emit('chat_message', {
          system: true,
          text: 'You are the drawer, you cannot guess!',
          playerId: player.id
        });
        if (typeof callback === 'function') callback({ success: false, reason: 'Drawer cannot guess' });
        return;
      }

      // If player already guessed correctly this round
      if (player.hasGuessed) {
        // Send message only to other players who have guessed and the drawer
        room.players.forEach(p => {
          if (p.hasGuessed || p.id === room.game.currentDrawerId) {
            io.to(p.socketId).emit('chat_message', {
              playerId: player.id,
              playerName: player.name,
              text: rawText,
              alreadyGuessed: true
            });
          }
        });
        if (typeof callback === 'function') callback({ success: true, alreadyGuessed: true });
        return;
      }

      // Process guess through game engine
      const result = room.game.handleGuess(player, rawText);

      if (result.correct) {
        if (typeof callback === 'function') {
          callback({ success: true, correct: true, points: result.points });
        }
      } else {
        // Broadcast incorrect guess as standard chat to all players
        io.to(room.id).emit('chat_message', {
          playerId: player.id,
          playerName: player.name,
          text: rawText
        });

        if (typeof callback === 'function') {
          callback({ success: true, correct: false });
        }
      }
    } catch (err) {
      console.error('Error handling guess:', err);
    }
  });

  /**
   * Handle general chat
   * Payload: { text: string }
   */
  socket.on('chat', (payload = {}, callback) => {
    try {
      const mapping = roomStore.getSocketMapping(socket.id);
      if (!mapping) return;

      const room = roomStore.getRoom(mapping.roomId);
      if (!room) return;

      const player = room.getPlayer(mapping.playerId);
      if (!player) return;

      const text = (payload.text || '').trim();
      if (!text) return;

      // Broadcast chat message
      io.to(room.id).emit('chat_message', {
        playerId: player.id,
        playerName: player.name,
        text
      });

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error handling chat:', err);
    }
  });
}
