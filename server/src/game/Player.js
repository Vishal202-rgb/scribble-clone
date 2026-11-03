export class Player {
  /**
   * @param {string} id - Unique identifier
   * @param {string} socketId - Active socket connection id
   * @param {string} name - Player nickname
   * @param {boolean} isHost - Host flag
   */
  constructor(id, socketId, name, isHost = false) {
    this.id = id;
    this.socketId = socketId;
    this.name = name.trim();
    this.isHost = isHost;
    this.score = 0;
    this.roundScore = 0;
    this.hasGuessed = false;
    this.guessOrder = 0;
    this.isDrawing = false;
    this.joinedAt = Date.now();
  }

  setHost(isHost) {
    this.isHost = Boolean(isHost);
  }

  resetRoundState() {
    this.hasGuessed = false;
    this.roundScore = 0;
    this.guessOrder = 0;
    this.isDrawing = false;
  }

  resetGameState() {
    this.score = 0;
    this.resetRoundState();
  }

  addScore(points) {
    this.roundScore += points;
    this.score += points;
  }

  toPublicJSON() {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      isHost: this.isHost,
      score: this.score,
      roundScore: this.roundScore,
      hasGuessed: this.hasGuessed,
      isDrawing: this.isDrawing
    };
  }
}
