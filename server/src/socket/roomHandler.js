import { Player } from '../game/Player.js';
import { roomStore } from '../utils/roomStore.js';

/**
 * Handles room and lobby WebSocket events
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerRoomHandler(io, socket) {
  /**
   * Handle room creation
   * Payload: { hostName: string, settings?: object }
   */
  socket.on('create_room', (payload = {}, callback) => {
    try {
      const hostName = (payload.hostName || '').trim();
      if (!hostName) {
        const errorMsg = 'Please enter a valid nickname.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      const playerId = `p_${socket.id.substring(0, 8)}_${Date.now().toString(36)}`;
      const hostPlayer = new Player(playerId, socket.id, hostName, true);
      const room = roomStore.createRoom(hostPlayer, payload.settings || {});

      socket.join(room.id);

      const roomData = room.toPublicJSON();
      const playerData = hostPlayer.toPublicJSON();

      const response = {
        success: true,
        room: roomData,
        player: playerData
      };

      if (typeof callback === 'function') {
        callback(response);
      }
      socket.emit('room_created', response);
      // Also broadcast player_joined to keep consistent with event specification
      io.to(room.id).emit('player_joined', {
        player: playerData,
        players: room.getPlayersList()
      });

      console.log(`[Room created] Room: ${room.id} | Host: ${hostName} (${socket.id})`);
    } catch (err) {
      console.error('Error creating room:', err);
      const errorMsg = err.message || 'Failed to create room.';
      if (typeof callback === 'function') callback({ success: false, error: errorMsg });
      socket.emit('error_message', { message: errorMsg });
    }
  });

  /**
   * Handle room joining
   * Payload: { roomId: string, playerName: string }
   */
  socket.on('join_room', (payload = {}, callback) => {
    try {
      const rawRoomId = (payload.roomId || '').trim().toUpperCase();
      const playerName = (payload.playerName || '').trim();

      if (!rawRoomId) {
        const errorMsg = 'Room code is required.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (!playerName) {
        const errorMsg = 'Please enter a valid nickname.';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      const room = roomStore.getRoom(rawRoomId);
      if (!room) {
        const errorMsg = `Room "${rawRoomId}" not found. Please check the code.`;
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (room.isFull()) {
        const errorMsg = `Room "${rawRoomId}" is full (maximum ${room.settings.maxPlayers} players).`;
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      if (room.gameState !== 'LOBBY') {
        const errorMsg = `Game has already started in room "${rawRoomId}".`;
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        socket.emit('error_message', { message: errorMsg });
        return;
      }

      // Check for duplicate nickname and disambiguate if necessary
      let finalName = playerName;
      const existingNames = new Set(Array.from(room.players.values()).map((p) => p.name.toLowerCase()));
      if (existingNames.has(finalName.toLowerCase())) {
        let counter = 2;
        while (existingNames.has(`${finalName} (${counter})`.toLowerCase())) {
          counter++;
        }
        finalName = `${finalName} (${counter})`;
      }

      const playerId = `p_${socket.id.substring(0, 8)}_${Date.now().toString(36)}`;
      const player = new Player(playerId, socket.id, finalName, false);
      room.addPlayer(player);
      roomStore.registerSocket(socket.id, room.id, player.id);

      socket.join(room.id);

      const roomData = room.toPublicJSON();
      const playerData = player.toPublicJSON();

      const response = {
        success: true,
        room: roomData,
        player: playerData
      };

      if (typeof callback === 'function') {
        callback(response);
      }
      socket.emit('room_joined', response);

      // Broadcast to all clients in the room (including new player)
      io.to(room.id).emit('player_joined', {
        player: playerData,
        players: room.getPlayersList(),
        room: roomData
      });

      console.log(`[Player joined] Room: ${room.id} | Player: ${finalName} (${socket.id})`);
    } catch (err) {
      console.error('Error joining room:', err);
      const errorMsg = err.message || 'Failed to join room.';
      if (typeof callback === 'function') callback({ success: false, error: errorMsg });
      socket.emit('error_message', { message: errorMsg });
    }
  });

  /**
   * Handle room leaving
   * Payload: { roomId?: string, playerId?: string }
   */
  socket.on('leave_room', (payload = {}, callback) => {
    try {
      handlePlayerDeparture(io, socket, payload.roomId, payload.playerId);
      if (typeof callback === 'function') {
        callback({ success: true });
      }
      socket.emit('left_room', { success: true });
    } catch (err) {
      console.error('Error leaving room:', err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', () => {
    try {
      handlePlayerDeparture(io, socket);
    } catch (err) {
      console.error('Error on socket disconnect cleanup:', err);
    }
  });

  /**
   * Start game handler (host only)
   */
  socket.on('start_game', (payload = {}, callback) => {
    const mapping = roomStore.getSocketMapping(socket.id);
    if (!mapping) return;

    const room = roomStore.getRoom(mapping.roomId);
    if (!room) return;

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

    console.log(`[Game Start Requested] Room: ${room.id} by Host ${mapping.playerId}`);
    io.to(room.id).emit('game_starting', {
      message: 'Game is starting...',
      roomId: room.id
    });

    if (typeof callback === 'function') {
      callback({ success: true, message: 'Game started' });
    }
  });
}

/**
 * Common departure cleanup helper
 */
function handlePlayerDeparture(io, socket, explicitRoomId, explicitPlayerId) {
  let roomId = explicitRoomId;
  let playerId = explicitPlayerId;

  if (!roomId || !playerId) {
    const mapping = roomStore.getSocketMapping(socket.id);
    if (mapping) {
      roomId = roomId || mapping.roomId;
      playerId = playerId || mapping.playerId;
    }
  }

  roomStore.unregisterSocket(socket.id);

  if (!roomId) return;

  const room = roomStore.getRoom(roomId);
  if (!room) return;

  const resolvedPlayerId = playerId || room.getPlayerBySocketId(socket.id)?.id;
  if (!resolvedPlayerId) return;

  const removedPlayer = room.removePlayer(resolvedPlayerId);
  socket.leave(room.id);

  if (!removedPlayer) return;

  console.log(`[Player left] Room: ${room.id} | Player: ${removedPlayer.name}`);

  if (room.players.size === 0) {
    roomStore.deleteRoom(room.id);
    console.log(`[Room deleted] Room: ${room.id} (empty)`);
  } else {
    // Notify remaining players with updated players list and new host info
    io.to(room.id).emit('player_left', {
      playerId: resolvedPlayerId,
      players: room.getPlayersList(),
      hostId: room.hostId,
      room: room.toPublicJSON()
    });
  }
}
