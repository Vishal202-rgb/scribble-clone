import { Game } from './Game.js';

export class Room {
  /**
   * @param {string} id - Unique 6-character room code
   * @param {string} hostId - Initial host player id
   * @param {object} settings - Room configuration
   */
  constructor(id, hostId, settings = {}) {
    this.id = id.toUpperCase();
    this.hostId = hostId;
    this.settings = {
      maxPlayers: Math.min(Math.max(Number(settings.maxPlayers) || 8, 2), 20),
      rounds: Math.min(Math.max(Number(settings.rounds) || 3, 2), 10),
      drawTime: Math.min(Math.max(Number(settings.drawTime) || 80, 15), 240),
      wordCount: Math.min(Math.max(Number(settings.wordCount) || 3, 1), 5),
      hints: Math.min(Math.max(Number(settings.hints) || 2, 0), 5),
      isPrivate: settings.isPrivate !== undefined ? Boolean(settings.isPrivate) : true
    };
    /** @type {Map<string, import('./Player.js').Player>} */
    this.players = new Map();
    this.gameState = 'LOBBY'; // 'LOBBY' | 'IN_GAME'
    this.createdAt = Date.now();
    /** @type {Game | null} */
    this.game = null;
  }

  isFull() {
    return this.players.size >= this.settings.maxPlayers;
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  getPlayerBySocketId(socketId) {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        return player;
      }
    }
    return null;
  }

  addPlayer(player) {
    if (this.isFull()) {
      throw new Error('Room is full');
    }
    this.players.set(player.id, player);
    if (!this.hostId) {
      this.hostId = player.id;
      player.setHost(true);
    }
    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    this.players.delete(playerId);

    if (this.game) {
      this.game.handlePlayerDeparture(playerId);
    }

    // If leaving player was host, promote next player in line
    if (this.hostId === playerId && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      if (nextHost) {
        this.hostId = nextHost.id;
        nextHost.setHost(true);
      }
    }

    return player;
  }

  updateSettings(newSettings = {}) {
    if (newSettings.maxPlayers !== undefined) {
      this.settings.maxPlayers = Math.min(Math.max(Number(newSettings.maxPlayers) || 8, 2), 20);
    }
    if (newSettings.rounds !== undefined) {
      this.settings.rounds = Math.min(Math.max(Number(newSettings.rounds) || 3, 2), 10);
    }
    if (newSettings.drawTime !== undefined) {
      this.settings.drawTime = Math.min(Math.max(Number(newSettings.drawTime) || 80, 15), 240);
    }
    if (newSettings.wordCount !== undefined) {
      this.settings.wordCount = Math.min(Math.max(Number(newSettings.wordCount) || 3, 1), 5);
    }
    if (newSettings.hints !== undefined) {
      this.settings.hints = Math.min(Math.max(Number(newSettings.hints) || 2, 0), 5);
    }
  }

  startGame(io) {
    if (this.players.size < 2) {
      throw new Error('At least 2 players are required to start the game.');
    }
    if (this.game && typeof this.game.clearTimer === 'function') {
      this.game.clearTimer();
    }
    this.gameState = 'IN_GAME';
    this.game = new Game(this, io);
    this.game.start();
    return this.game;
  }

  getPlayersList() {
    return Array.from(this.players.values()).map((p) => p.toPublicJSON());
  }

  toPublicJSON() {
    return {
      roomId: this.id,
      hostId: this.hostId,
      settings: { ...this.settings },
      players: this.getPlayersList(),
      gameState: this.gameState,
      playerCount: this.players.size,
      currentRound: this.game?.currentRound || 0,
      totalRounds: this.settings.rounds,
      currentDrawerId: this.game?.currentDrawerId || null,
      phase: this.game?.phase || 'LOBBY'
    };
  }
}
