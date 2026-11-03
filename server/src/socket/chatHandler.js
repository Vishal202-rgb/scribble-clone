import { roomStore } from '../utils/roomStore.js';

/**
 * Handles real-time chat and guessing submissions
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerChatHandler(io, socket) {
  /**
   * Unified message and guess processor
   */
  function handleIncomingMessage(rawText, callback) {
    try {
      const mapping = roomStore.getSocketMapping(socket.id);
      if (!mapping) return;

      const room = roomStore.getRoom(mapping.roomId);
      if (!room) return;

      const player = room.getPlayer(mapping.playerId);
      if (!player) return;

      const text = String(rawText || '').trim();
      if (!text) return;

      const game = room.game;

      // 1. If no game or not in DRAWING phase: regular chat
      if (!game || game.phase !== 'DRAWING') {
        io.to(room.id).emit('chat_message', {
          playerId: player.id,
          playerName: player.name,
          text
        });
        if (typeof callback === 'function') callback({ success: true, isGuess: false });
        return;
      }

      // 2. If sender is the current drawer: cannot guess, but can chat
      if (player.id === game.currentDrawerId) {
        io.to(room.id).emit('chat_message', {
          playerId: player.id,
          playerName: player.name,
          text,
          isDrawer: true
        });
        if (typeof callback === 'function') callback({ success: true, isDrawer: true });
        return;
      }

      // 3. If player already guessed correctly this round: chat only with other guessers + drawer
      if (player.hasGuessed) {
        room.players.forEach(p => {
          if (p.hasGuessed || p.id === game.currentDrawerId) {
            io.to(p.socketId).emit('chat_message', {
              playerId: player.id,
              playerName: player.name,
              text,
              alreadyGuessed: true
            });
          }
        });
        if (typeof callback === 'function') callback({ success: true, alreadyGuessed: true });
        return;
      }

      // 4. Guesser in DRAWING phase: evaluate guess
      const result = game.handleGuess(player, text);

      if (result.correct) {
        // Correct guess! Points awarded and broadcasted by game.handleGuess
        if (typeof callback === 'function') {
          callback({ success: true, correct: true, points: result.points });
        }
      } else {
        // Incorrect guess: broadcast to all as regular chat
        io.to(room.id).emit('chat_message', {
          playerId: player.id,
          playerName: player.name,
          text
        });
        if (typeof callback === 'function') {
          callback({ success: true, correct: false });
        }
      }
    } catch (err) {
      console.error('Error handling player message:', err);
    }
  }

  /**
   * Handle player guess
   * Payload: { text: string }
   */
  socket.on('guess', (payload = {}, callback) => {
    handleIncomingMessage(payload.text, callback);
  });

  /**
   * Handle general chat
   * Payload: { text: string }
   */
  socket.on('chat', (payload = {}, callback) => {
    handleIncomingMessage(payload.text, callback);
  });
}
