import { Room } from '../game/Room.js';

class RoomStore {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();
    /** @type {Map<string, { roomId: string, playerId: string }>} */
    this.socketToRoom = new Map();
  }

  /**
   * Generates a 6-character uppercase alphanumeric room code
   * Excludes easily confused characters like O, 0, I, 1
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    let attempts = 0;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      attempts++;
    } while (this.rooms.has(code) && attempts < 1000);
    return code;
  }

  createRoom(hostPlayer, settings = {}) {
    const roomId = this.generateRoomCode();
    const room = new Room(roomId, hostPlayer.id, settings);
    room.addPlayer(hostPlayer);
    this.rooms.set(roomId, room);
    this.registerSocket(hostPlayer.socketId, roomId, hostPlayer.id);
    return room;
  }

  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase()) || null;
  }

  deleteRoom(roomId) {
    if (!roomId) return false;
    return this.rooms.delete(roomId.toUpperCase());
  }

  registerSocket(socketId, roomId, playerId) {
    this.socketToRoom.set(socketId, { roomId: roomId.toUpperCase(), playerId });
  }

  unregisterSocket(socketId) {
    const mapping = this.socketToRoom.get(socketId);
    this.socketToRoom.delete(socketId);
    return mapping || null;
  }

  getSocketMapping(socketId) {
    return this.socketToRoom.get(socketId) || null;
  }

  getAllRoomsCount() {
    return this.rooms.size;
  }
}

export const roomStore = new RoomStore();
