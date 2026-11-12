import { getRandomWords, maskWord, generateHintSchedule, isWordMatch } from '../words/wordService.js';

export class Game {
  /**
   * @param {import('./Room.js').Room} room
   * @param {import('socket.io').Server} io
   */
  constructor(room, io) {
    this.room = room;
    this.io = io;
    this.currentRound = 0;
    this.totalRounds = room.settings.rounds || 3;
    this.drawTime = room.settings.drawTime || 80;

    /** @type {'LOBBY' | 'CHOOSING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER'} */
    this.phase = 'LOBBY';

    /** @type {string[]} */
    this.drawerOrder = [];
    this.currentDrawerIndex = 0;
    this.currentDrawerId = null;

    /** @type {string | null} */
    this.currentWord = null;
    /** @type {string[]} */
    this.wordOptions = [];

    /** @type {any[]} */
    this.strokes = [];

    this.timeLeft = 0;
    this.roundStartTime = 0;
    this.roundEndsAt = 0;
    this.roundTimer = null;
    this.transitionTimer = null;
    this.timer = null;

    this.drawnPlayersThisRound = new Set();
    this.guessedCount = 0;
    this.revealedHintIndices = new Set();
    this.hintSchedule = [];
  }

  getLeaderboard() {
    return Array.from(this.room.players.values())
      .map(p => p.toPublicJSON())
      .sort((a, b) => b.score - a.score);
  }

  getCurrentDrawer() {
    if (!this.currentDrawerId) return null;
    return this.room.getPlayer(this.currentDrawerId);
  }

  getNextDrawerName() {
    for (const id of this.drawerOrder) {
      if (this.room.players.has(id) && !this.drawnPlayersThisRound.has(id)) {
        const p = this.room.getPlayer(id);
        if (p) return p.name;
      }
    }
    for (const [id, player] of this.room.players.entries()) {
      if (!this.drawnPlayersThisRound.has(id)) {
        return player.name;
      }
    }
    const firstId = this.drawerOrder[0] || Array.from(this.room.players.keys())[0];
    const firstPlayer = firstId ? this.room.getPlayer(firstId) : null;
    return firstPlayer ? firstPlayer.name : 'Next Player';
  }

  start() {
    if (this.room.players.size < 2) {
      throw new Error('At least 2 players required to start');
    }

    this.clearTimer();

    // Reset player scores
    for (const player of this.room.players.values()) {
      player.resetGameState();
    }

    // Setup turn order
    this.drawerOrder = Array.from(this.room.players.keys());
    this.currentRound = 1;
    this.currentDrawerIndex = 0;
    this.drawnPlayersThisRound.clear();

    // Broadcast reset leaderboard immediately
    this.broadcastLeaderboard();

    this.startWordSelection();
  }

  broadcastLeaderboard() {
    const leaderboard = this.getLeaderboard();
    this.io.to(this.room.id).emit('leaderboard_update', {
      players: leaderboard
    });
  }

  startWordSelection() {
    this.clearTimer();

    if (this.room.players.size < 2) {
      this.handlePlayerDeparture(null);
      return;
    }

    // Find next drawer in drawerOrder who hasn't drawn this round
    let nextDrawerId = null;
    for (const id of this.drawerOrder) {
      if (this.room.players.has(id) && !this.drawnPlayersThisRound.has(id)) {
        nextDrawerId = id;
        break;
      }
    }

    // Fallback: check any active player not yet drawn
    if (!nextDrawerId) {
      for (const id of this.room.players.keys()) {
        if (!this.drawnPlayersThisRound.has(id)) {
          nextDrawerId = id;
          break;
        }
      }
    }

    if (!nextDrawerId) {
      this.advanceRound();
      return;
    }

    this.currentDrawerId = nextDrawerId;
    this.drawnPlayersThisRound.add(nextDrawerId);
    this.currentDrawerIndex = this.drawerOrder.indexOf(nextDrawerId);
    if (this.currentDrawerIndex === -1) {
      this.drawerOrder.push(nextDrawerId);
      this.currentDrawerIndex = this.drawerOrder.length - 1;
    }

    const drawer = this.room.getPlayer(this.currentDrawerId);
    if (!drawer) {
      this.advanceDrawer();
      return;
    }

    // Reset round state for all players
    for (const p of this.room.players.values()) {
      p.resetRoundState();
      p.isDrawing = (p.id === this.currentDrawerId);
    }

    this.phase = 'CHOOSING_WORD';
    this.room.gameState = 'IN_GAME';
    this.currentWord = null;
    this.strokes = [];
    this.guessedCount = 0;
    this.revealedHintIndices.clear();

    // 1. Immediately clear canvas for all players so old drawing disappears
    this.io.to(this.room.id).emit('canvas_clear');

    const wordCount = Math.min(Math.max(this.room.settings.wordCount || 3, 1), 5);
    this.wordOptions = getRandomWords(wordCount);

    this.timeLeft = 15; // 15 seconds to choose
    this.roundStartTime = Date.now();
    this.roundEndsAt = this.roundStartTime + 15 * 1000;

    console.log(`[Round ${this.currentRound}/${this.totalRounds}] Word selection for ${drawer.name} (${drawer.id})`);

    const leaderboard = this.getLeaderboard();

    // Broadcast updated leaderboard with reset guess states to all players
    this.broadcastLeaderboard();

    // Emit round_start: drawer receives wordOptions, non-drawers receive round details
    this.io.to(drawer.socketId).emit('round_start', {
      drawerId: drawer.id,
      drawerName: drawer.name,
      wordOptions: this.wordOptions,
      drawTime: this.drawTime,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      players: leaderboard
    });

    this.room.players.forEach(p => {
      if (p.id !== drawer.id) {
        this.io.to(p.socketId).emit('round_start', {
          drawerId: drawer.id,
          drawerName: drawer.name,
          drawTime: this.drawTime,
          round: this.currentRound,
          totalRounds: this.totalRounds,
          players: leaderboard
        });
      }
    });

    // Broadcast CHOOSING_WORD game_state to entire room
    this.io.to(this.room.id).emit('game_state', {
      phase: 'CHOOSING_WORD',
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawerName: drawer.name,
      word: '',
      hints: '',
      timeLeft: this.timeLeft
    });

    // Choosing countdown with server-authoritative timestamp calculation
    this.roundTimer = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.ceil((this.roundEndsAt - Date.now()) / 1000));
      this.timeLeft = remainingSeconds;
      this.io.to(this.room.id).emit('timer_tick', { timeLeft: this.timeLeft });

      if (this.timeLeft <= 0) {
        this.clearTimer();
        // Auto select first word if drawer didn't choose in time
        const autoWord = this.wordOptions[0] || 'apple';
        console.log(`[Auto-selected word] ${autoWord} for ${drawer.name}`);
        this.chooseWord(drawer.id, autoWord);
      }
    }, 1000);
    this.timer = this.roundTimer;
  }

  chooseWord(playerId, word) {
    if (this.phase !== 'CHOOSING_WORD') return false;
    if (playerId !== this.currentDrawerId) return false;

    this.clearTimer();
    this.currentWord = (word || '').trim().toLowerCase();
    if (!this.currentWord) {
      this.currentWord = 'apple';
    }
    this.startDrawingPhase();
    return true;
  }

  startDrawingPhase() {
    this.clearTimer();
    this.phase = 'DRAWING';
    this.timeLeft = this.drawTime;
    this.roundStartTime = Date.now();
    this.roundEndsAt = this.roundStartTime + this.drawTime * 1000;
    this.strokes = [];
    this.guessedCount = 0;
    this.revealedHintIndices.clear();

    const maxHints = this.room.settings.hints !== undefined ? this.room.settings.hints : 2;
    this.hintSchedule = generateHintSchedule(this.currentWord, maxHints);

    console.log(`[Drawing Started] Word: "${this.currentWord}" | Drawer: ${this.currentDrawerId} | DrawTime: ${this.drawTime}s`);

    // Clear canvas on all clients for new round
    this.io.to(this.room.id).emit('canvas_clear');

    const drawer = this.getCurrentDrawer();
    const masked = maskWord(this.currentWord, this.revealedHintIndices);

    // 1. Broadcast DRAWING state with masked hints to non-drawers
    this.room.players.forEach(p => {
      if (p.id !== this.currentDrawerId) {
        this.io.to(p.socketId).emit('game_state', {
          phase: 'DRAWING',
          round: this.currentRound,
          totalRounds: this.totalRounds,
          drawerId: this.currentDrawerId,
          drawerName: drawer ? drawer.name : '',
          word: '',
          hints: masked,
          timeLeft: this.timeLeft
        });
      }
    });

    // 2. Deliver unmasked word privately to the drawer
    if (drawer) {
      this.io.to(drawer.socketId).emit('game_state', {
        phase: 'DRAWING',
        round: this.currentRound,
        totalRounds: this.totalRounds,
        drawerId: drawer.id,
        drawerName: drawer.name,
        word: this.currentWord,
        hints: this.currentWord.toUpperCase(),
        timeLeft: this.timeLeft
      });
    }

    // Calculate hint reveal timestamps
    const hintTimes = [];
    if (this.hintSchedule.length === 1) {
      hintTimes.push(Math.floor(this.drawTime * 0.4));
    } else if (this.hintSchedule.length >= 2) {
      hintTimes.push(Math.floor(this.drawTime * 0.6));
      hintTimes.push(Math.floor(this.drawTime * 0.3));
    }

    // Drawing timer loop with server-authoritative timestamp calculation
    this.roundTimer = setInterval(() => {
      const remainingSeconds = Math.max(0, Math.ceil((this.roundEndsAt - Date.now()) / 1000));
      this.timeLeft = remainingSeconds;
      this.io.to(this.room.id).emit('timer_tick', { timeLeft: this.timeLeft });

      // Check hint unlocks
      if (this.hintSchedule.length > 0 && hintTimes.length > 0) {
        if (this.timeLeft <= hintTimes[0]) {
          const nextIndex = this.hintSchedule[this.revealedHintIndices.size];
          if (nextIndex !== undefined) {
            this.revealedHintIndices.add(nextIndex);
            this.broadcastMaskedGameState();
          }
          hintTimes.shift();
        }
      }

      // Check time out
      if (this.timeLeft <= 0) {
        this.clearTimer();
        this.endRound('time_up');
      }
    }, 1000);
    this.timer = this.roundTimer;
  }

  broadcastGameState() {
    const drawer = this.getCurrentDrawer();
    this.io.to(this.room.id).emit('game_state', {
      phase: this.phase,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawerName: drawer ? drawer.name : '',
      word: '',
      hints: this.phase === 'DRAWING' ? maskWord(this.currentWord, this.revealedHintIndices) : '',
      timeLeft: this.timeLeft
    });
  }

  broadcastMaskedGameState() {
    const drawer = this.getCurrentDrawer();
    const masked = maskWord(this.currentWord, this.revealedHintIndices);

    this.room.players.forEach(p => {
      if (p.id !== this.currentDrawerId) {
        this.io.to(p.socketId).emit('game_state', {
          phase: 'DRAWING',
          round: this.currentRound,
          totalRounds: this.totalRounds,
          drawerId: this.currentDrawerId,
          drawerName: drawer ? drawer.name : '',
          word: '',
          hints: masked,
          timeLeft: this.timeLeft
        });
      }
    });
  }

  handleGuess(player, rawText) {
    if (this.phase !== 'DRAWING') {
      return { success: false, reason: 'Game is not in drawing phase.' };
    }

    if (player.id === this.currentDrawerId) {
      return { success: false, reason: 'The drawer cannot make guesses.' };
    }

    if (player.hasGuessed) {
      return { success: true, alreadyGuessed: true };
    }

    const text = String(rawText || '').trim();
    if (!text) return { success: false, reason: 'Empty guess' };

    // Case-insensitive, whitespace-trimmed, punctuation-normalized comparison
    const isCorrect = isWordMatch(text, this.currentWord);

    if (isCorrect) {
      player.hasGuessed = true;
      this.guessedCount++;
      player.guessOrder = this.guessedCount;

      // Authoritative remaining time calculation
      const authoritativeTimeLeft = this.roundEndsAt
        ? Math.max(0, Math.ceil((this.roundEndsAt - Date.now()) / 1000))
        : this.timeLeft;

      // Calculate score based on remaining time and guess order
      // Base: 100, Time component: up to 350, First bonus: +50, Second bonus: +25
      const timeRatio = Math.max(0, Math.min(1, authoritativeTimeLeft / (this.drawTime || 80)));
      const timeBonus = Math.round(timeRatio * 350);
      const firstBonus = this.guessedCount === 1 ? 50 : (this.guessedCount === 2 ? 25 : 0);
      const points = 100 + timeBonus + firstBonus;

      player.addScore(points);

      // Reward drawer for helping players guess (+50 per guesser)
      const drawer = this.getCurrentDrawer();
      if (drawer) {
        drawer.addScore(50);
      }

      const updatedLeaderboard = this.getLeaderboard();

      // 1. Broadcast guess_result to all players in the room
      this.io.to(this.room.id).emit('guess_result', {
        correct: true,
        playerId: player.id,
        playerName: player.name,
        points,
        leaderboard: updatedLeaderboard
      });

      // 2. Broadcast leaderboard_update to guarantee all screens update
      this.io.to(this.room.id).emit('leaderboard_update', {
        players: updatedLeaderboard
      });

      // 3. Broadcast system celebration message in chat
      this.io.to(this.room.id).emit('chat_message', {
        system: true,
        text: `${player.name} guessed the word! (+${points} pts)`,
        playerId: player.id,
        points,
        isCorrectGuess: true
      });

      console.log(`[Correct Guess] ${player.name} guessed "${this.currentWord}" (+${points} pts, ${authoritativeTimeLeft}s left). Drawer (${drawer?.name}) awarded +50 pts.`);

      // Check if all non-drawers have guessed
      const nonDrawersCount = this.room.players.size - 1;
      if (this.guessedCount >= nonDrawersCount) {
        console.log(`[All Players Guessed] Ending round early in room ${this.room.id}`);
        this.endRound('all_guessed');
      }

      return { success: true, correct: true, points };
    }

    // Check if close guess (Levenshtein distance == 1)
    if (this.isCloseGuess(text.toLowerCase().trim(), this.currentWord.toLowerCase().trim())) {
      this.io.to(player.socketId).emit('chat_message', {
        system: true,
        text: `"${text}" is very close!`,
        playerId: player.id
      });
    }

    return { success: true, correct: false };
  }

  isCloseGuess(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let edits = 0;
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] !== b[j]) {
        edits++;
        if (edits > 1) return false;
        if (a.length > b.length) i++;
        else if (b.length > a.length) j++;
        else { i++; j++; }
      } else {
        i++; j++;
      }
    }
    return true;
  }

  endRound(reason = 'time_up') {
    if (this.phase === 'ROUND_END' || this.phase === 'GAME_OVER' || this.phase === 'LOBBY') {
      return;
    }

    this.clearTimer();
    this.phase = 'ROUND_END';
    this.timeLeft = 0;

    const wordRevealed = this.currentWord;
    const leaderboard = this.getLeaderboard();
    const nextDrawer = this.getNextDrawerName();

    console.log(`[Round Ended] Reason: ${reason} | Word: ${wordRevealed}`);

    this.io.to(this.room.id).emit('round_end', {
      word: wordRevealed,
      scores: leaderboard,
      nextDrawer,
      reason
    });

    this.io.to(this.room.id).emit('leaderboard_update', {
      players: leaderboard
    });

    this.io.to(this.room.id).emit('game_state', {
      phase: 'ROUND_END',
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      word: wordRevealed,
      hints: (wordRevealed || '').toUpperCase(),
      timeLeft: 0
    });

    // Wait 5 seconds before advancing to next drawer / round
    this.transitionTimer = setTimeout(() => {
      this.transitionTimer = null;
      this.advanceDrawer();
    }, 5000);
    this.timer = this.transitionTimer;
  }

  advanceDrawer() {
    this.clearTimer();

    if (this.room.players.size < 2) {
      this.handlePlayerDeparture(null);
      return;
    }

    // Check if any active player has not yet drawn this round
    const activePlayerIds = Array.from(this.room.players.keys());
    const remainingToDraw = activePlayerIds.filter(id => !this.drawnPlayersThisRound.has(id));

    if (remainingToDraw.length === 0) {
      // Completed full rotation for all players in this round
      this.advanceRound();
    } else {
      // Next drawer in current round
      this.startWordSelection();
    }
  }

  advanceRound() {
    this.clearTimer();
    if (this.currentRound >= this.totalRounds) {
      this.endGame();
    } else {
      this.currentRound++;
      this.drawnPlayersThisRound.clear();
      this.drawerOrder = Array.from(this.room.players.keys());
      this.currentDrawerIndex = 0;
      this.startWordSelection();
    }
  }

  endGame() {
    this.clearTimer();
    this.phase = 'GAME_OVER';
    this.room.gameState = 'LOBBY';
    this.timeLeft = 0;

    const leaderboard = this.getLeaderboard();
    const winner = leaderboard.length > 0 ? leaderboard[0] : null;

    console.log(`[Game Over] Room: ${this.room.id} | Winner: ${winner ? winner.name : 'None'}`);

    this.io.to(this.room.id).emit('game_over', {
      winner,
      leaderboard
    });

    this.io.to(this.room.id).emit('leaderboard_update', {
      players: leaderboard
    });

    this.io.to(this.room.id).emit('game_state', {
      phase: 'GAME_OVER',
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: null,
      hints: '',
      timeLeft: 0
    });
  }

  handlePlayerDeparture(playerId) {
    if (playerId) {
      this.drawerOrder = this.drawerOrder.filter(id => id !== playerId);
      this.drawnPlayersThisRound.delete(playerId);
    }

    if (this.room.players.size < 2 && (this.phase === 'DRAWING' || this.phase === 'CHOOSING_WORD' || this.phase === 'ROUND_END')) {
      this.clearTimer();
      this.phase = 'LOBBY';
      this.room.gameState = 'LOBBY';
      this.io.to(this.room.id).emit('error_message', {
        message: 'Game paused: not enough players to continue. Returned to lobby.'
      });
      this.io.to(this.room.id).emit('game_state', {
        phase: 'LOBBY',
        round: 0,
        totalRounds: this.totalRounds,
        drawerId: null,
        hints: '',
        timeLeft: 0
      });
      return;
    }

    if (playerId && playerId === this.currentDrawerId) {
      if (this.phase === 'DRAWING' || this.phase === 'CHOOSING_WORD') {
        console.log(`[Drawer Left] Advancing round in room ${this.room.id}`);
        this.endRound('drawer_left');
      }
    }
  }

  clearTimer() {
    if (this.roundTimer) {
      clearInterval(this.roundTimer);
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      clearInterval(this.transitionTimer);
      this.transitionTimer = null;
    }
    if (this.timer) {
      clearInterval(this.timer);
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
