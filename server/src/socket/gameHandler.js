import { roomStore } from '../utils/roomStore.js';

/**
 * Handles game progression and turn-based events
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerGameHandler(io, socket) {
  /**
   * Start game handler (host only)
   */
  socket.on('start_game', (payload = {}, callback) => {
    try {
      const mapping = roomStore.getSocketMapping(socket.id);
      if (!mapping) {
        const errorMsg = 'Player session not found.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      const room = roomStore.getRoom(mapping.roomId);
      if (!room) {
        const errorMsg = 'Room not found.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (room.hostId !== mapping.playerId) {
        const errorMsg = 'Only the room host can start the game.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (room.players.size < 2) {
        const errorMsg = 'At least 2 players are required to start the game.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      console.log(`[Game Starting] Room: ${room.id} started by Host ${mapping.playerId}`);
      io.to(room.id).emit('game_starting', {
        message: 'Game is starting...',
        roomId: room.id
      });
      room.startGame(io);

      if (typeof callback === 'function') {
        callback({ success: true, message: 'Game started' });
      }
    } catch (err) {
      console.error('Error starting game:', err);
      const errorMsg = err.message || 'Failed to start game.';
      if (typeof callback === 'function') callback({ success: false, error: errorMsg });
      socket.emit('error_message', { message: errorMsg });
    }
  });

  /**
   * Word chosen by drawer
   * Payload: { word: string }
   */
  socket.on('word_chosen', (payload = {}, callback) => {
    try {
      const mapping = roomStore.getSocketMapping(socket.id);
      if (!mapping) return;

      const room = roomStore.getRoom(mapping.roomId);
      if (!room || !room.game) return;

      const drawer = room.getPlayer(mapping.playerId);
      if (drawer && drawer.socketId !== socket.id) {
        drawer.socketId = socket.id;
        roomStore.registerSocket(socket.id, room.id, drawer.id);
      }

      const success = room.game.chooseWord(mapping.playerId, payload.word);
      if (!success) {
        const errorMsg = 'Invalid word selection or not current drawer.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (err) {
      console.error('Error choosing word:', err);
    }
  });
}
