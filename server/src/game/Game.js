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
    this.timer = null;

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
    const nextIndex = (this.currentDrawerIndex + 1) % (this.drawerOrder.length || 1);
    const nextId = this.drawerOrder[nextIndex];
    const player = this.room.getPlayer(nextId);
    return player ? player.name : 'Next Player';
  }

  start() {
    if (this.room.players.size < 2) {
      throw new Error('At least 2 players required to start');
    }

    // Reset player scores
    for (const player of this.room.players.values()) {
      player.resetGameState();
    }

    // Setup turn order
    this.drawerOrder = Array.from(this.room.players.keys());
    this.currentRound = 1;
    this.currentDrawerIndex = 0;

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

    // Check if drawer exists, else advance
    while (
      this.currentDrawerIndex < this.drawerOrder.length &&
      !this.room.getPlayer(this.drawerOrder[this.currentDrawerIndex])
    ) {
      this.currentDrawerIndex++;
    }

    if (this.currentDrawerIndex >= this.drawerOrder.length) {
      this.advanceRound();
      return;
    }

    this.currentDrawerId = this.drawerOrder[this.currentDrawerIndex];
    const drawer = this.room.getPlayer(this.currentDrawerId);
    if (!drawer) {
      this.advanceRound();
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

    // Choosing countdown
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.io.to(this.room.id).emit('timer_tick', { timeLeft: this.timeLeft });
      if (this.timeLeft <= 0) {
        this.clearTimer();
        // Auto select first word if drawer didn't choose in time
        const autoWord = this.wordOptions[0] || 'apple';
        console.log(`[Auto-selected word] ${autoWord} for ${drawer.name}`);
        this.chooseWord(drawer.id, autoWord);
      }
    }, 1000);
  }

  chooseWord(playerId, word) {
    if (this.phase !== 'CHOOSING_WORD') return false;
    if (playerId !== this.currentDrawerId) return false;

    this.clearTimer();
    this.currentWord = word.trim().toLowerCase();
    this.startDrawingPhase();
    return true;
  }

  startDrawingPhase() {
    this.phase = 'DRAWING';
    this.timeLeft = this.drawTime;
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

    // 1. Broadcast DRAWING state with masked hints to the ENTIRE room first
    // This guarantees EVERY client updates their phase to DRAWING and drawerId synchronously
    this.io.to(this.room.id).emit('game_state', {
      phase: 'DRAWING',
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawerName: drawer ? drawer.name : '',
      word: '',
      hints: masked,
      timeLeft: this.timeLeft
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

    // Drawing timer loop
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.io.to(this.room.id).emit('timer_tick', { timeLeft: this.timeLeft });

      // Check hint unlocks
      if (this.hintSchedule.length > 0 && hintTimes.length > 0) {
        if (this.timeLeft === hintTimes[0]) {
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
        this.endRound('time_up');
      }
    }, 1000);
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

      // Calculate score based on remaining time and guess order
      // Base: 100, Time component: up to 350, First bonus: +50, Second bonus: +25
      const timeRatio = Math.max(0, this.timeLeft / (this.drawTime || 80));
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

      console.log(`[Correct Guess] ${player.name} guessed "${this.currentWord}" (+${points} pts). Drawer (${drawer?.name}) awarded +50 pts.`);

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
    this.clearTimer();
    this.phase = 'ROUND_END';

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
      hints: wordRevealed.toUpperCase(),
      timeLeft: 0
    });

    // Wait 5 seconds before advancing to next drawer / round
    this.timer = setTimeout(() => {
      this.advanceDrawer();
    }, 5000);
  }

  advanceDrawer() {
    this.currentDrawerIndex++;

    if (this.currentDrawerIndex >= this.drawerOrder.length) {
      // Completed full rotation for all players in this round
      this.advanceRound();
    } else {
      // Next drawer in current round
      this.startWordSelection();
    }
  }

  advanceRound() {
    if (this.currentRound >= this.totalRounds) {
      this.endGame();
    } else {
      this.currentRound++;
      this.currentDrawerIndex = 0;
      // Re-sync active players in case someone left/joined
      this.drawerOrder = Array.from(this.room.players.keys());
      this.startWordSelection();
    }
  }

  endGame() {
    this.clearTimer();
    this.phase = 'GAME_OVER';
    this.room.gameState = 'LOBBY';

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
    if (playerId === this.currentDrawerId) {
      if (this.phase === 'DRAWING' || this.phase === 'CHOOSING_WORD') {
        console.log(`[Drawer Left] Advancing round in room ${this.room.id}`);
        this.endRound('drawer_left');
      }
    }

    this.drawerOrder = this.drawerOrder.filter(id => id !== playerId);

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
    }
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
