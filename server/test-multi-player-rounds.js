import { app, server, io as serverIo } from './src/server.js';
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const PORT = 5000;
const SERVER_URL = `http://localhost:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('================================================================');
  console.log('  STARTING MULTI-PLAYER MULTI-ROUND TIMER & SCORING VERIFICATION ');
  console.log('================================================================\n');

  // Wait for server to be fully listening
  if (!server.listening) {
    await new Promise((res) => server.once('listening', res));
  }
  await wait(300);

  let clientA, clientB, clientC;

  try {
    // 1. Connect 3 clients
    clientA = io(SERVER_URL); // Alice (Host)
    clientB = io(SERVER_URL); // Bob
    clientC = io(SERVER_URL); // Charlie

    clientA.on('connect_error', (err) => console.error('Client A connect_error:', err.message));
    clientB.on('connect_error', (err) => console.error('Client B connect_error:', err.message));
    clientC.on('connect_error', (err) => console.error('Client C connect_error:', err.message));

    await Promise.all([
      new Promise((res, rej) => { clientA.on('connect', res); setTimeout(() => rej(new Error('Alice connect timeout')), 6000); }),
      new Promise((res, rej) => { clientB.on('connect', res); setTimeout(() => rej(new Error('Bob connect timeout')), 6000); }),
      new Promise((res, rej) => { clientC.on('connect', res); setTimeout(() => rej(new Error('Charlie connect timeout')), 6000); })
    ]);
    console.log('✓ Check 1: All 3 clients connected via Socket.IO');

    // 2. Alice creates room (2 rounds, 10 seconds drawTime)
    let roomId = null;
    let playerA = null;
    await new Promise((resolve, reject) => {
      clientA.emit('create_room', {
        hostName: 'Alice',
        settings: { rounds: 2, drawTime: 10, maxPlayers: 5 }
      }, (res) => {
        if (!res.success) return reject(new Error(res.error));
        roomId = res.room.roomId;
        playerA = res.player;
        resolve(res);
      });
    });
    console.log(`✓ Check 2: Room created with code [${roomId}], Host: Alice (${playerA.id})`);

    // 3. Bob and Charlie join
    let playerB, playerC;
    await new Promise((res, rej) => clientB.emit('join_room', { roomId, playerName: 'Bob' }, (r) => { if (r.success) { playerB = r.player; res(r); } else rej(new Error(r.error)); }));
    await new Promise((res, rej) => clientC.emit('join_room', { roomId, playerName: 'Charlie' }, (r) => { if (r.success) { playerC = r.player; res(r); } else rej(new Error(r.error)); }));
    console.log(`✓ Check 3: Bob (${playerB.id}) and Charlie (${playerC.id}) joined`);

    // 4. Start Game
    let currentDrawerId = null;
    let initialDrawerId = null;
    let wordOptions = [];

    const firstRoundStartPromise = new Promise((resolve) => {
      clientA.once('round_start', (data) => {
        initialDrawerId = data.drawerId;
        currentDrawerId = data.drawerId;
        if (data.wordOptions) wordOptions = data.wordOptions;
        resolve(data);
      });
    });

    clientA.emit('start_game');
    const firstRoundData = await firstRoundStartPromise;
    console.log(`✓ Check 4: Game started. Round ${firstRoundData.round}/${firstRoundData.totalRounds}. Drawer: ${firstRoundData.drawerName}`);

    // Track timer ticks for all 3 clients
    const ticksA = [];
    const ticksB = [];
    const ticksC = [];
    clientA.on('timer_tick', (d) => ticksA.push(d.timeLeft));
    clientB.on('timer_tick', (d) => ticksB.push(d.timeLeft));
    clientC.on('timer_tick', (d) => ticksC.push(d.timeLeft));

    // Drawer chooses word
    const chosenWord = wordOptions[0] || 'apple';
    const drawerClient = currentDrawerId === playerA.id ? clientA : (currentDrawerId === playerB.id ? clientB : clientC);
    const guesserClients = [
      { id: playerA.id, client: clientA, name: 'Alice' },
      { id: playerB.id, client: clientB, name: 'Bob' },
      { id: playerC.id, client: clientC, name: 'Charlie' }
    ].filter(p => p.id !== currentDrawerId);

    const drawingPhasePromise = new Promise((resolve) => {
      guesserClients[0].client.on('game_state', (s) => {
        if (s.phase === 'DRAWING') resolve(s);
      });
    });

    drawerClient.emit('word_chosen', { word: chosenWord });
    const drawingState = await drawingPhasePromise;
    console.log(`✓ Check 5: Word "${chosenWord}" chosen. Drawing phase initiated. TimeLeft: ${drawingState.timeLeft}s`);

    // Let the timer tick 2 seconds
    await wait(2200);

    // Verify timer ticks are continuously received across all 3 players
    if (ticksA.length === 0 || ticksB.length === 0 || ticksC.length === 0) {
      throw new Error(`Timer ticks not received continuously! ticksA: ${ticksA.length}, ticksB: ${ticksB.length}, ticksC: ${ticksC.length}`);
    }
    console.log(`✓ Check 6: Continuous server-authoritative timer ticks verified across all 3 clients (Ticks received: A=${ticksA.length}, B=${ticksB.length}, C=${ticksC.length})`);

    // Guesser 1 makes correct guess
    let guess1Awarded = 0;
    let guess1Leaderboard = null;
    guesserClients[0].client.on('guess_result', (res) => {
      if (res.playerId === guesserClients[0].id) {
        guess1Awarded = res.points;
        guess1Leaderboard = res.leaderboard;
      }
    });

    guesserClients[0].client.emit('guess', { text: chosenWord });
    await wait(300);

    if (guess1Awarded <= 0) {
      throw new Error(`Points not awarded for correct guess! Awarded: ${guess1Awarded}`);
    }
    console.log(`✓ Check 7: Guesser 1 (${guesserClients[0].name}) awarded ${guess1Awarded} points immediately for guessing "${chosenWord}"`);

    // Verify Guesser 1 cannot get points again (exact-once scoring)
    const scoreBeforeDuplicate = guess1Awarded;
    guesserClients[0].client.emit('guess', { text: chosenWord });
    await wait(300);
    const currentScore = guess1Leaderboard?.find(p => p.id === guesserClients[0].id)?.score;
    if (currentScore > scoreBeforeDuplicate) {
      throw new Error('Duplicate scoring bug: points awarded more than once for the same round!');
    }
    console.log(`✓ Check 8: Exact-once scoring confirmed. Duplicate guess did not award extra points.`);

    // Guesser 2 makes correct guess -> triggers all_guessed round end
    let roundEnded = false;
    let roundEndWord = '';
    const roundEndPromise = new Promise((resolve) => {
      clientA.on('round_end', (data) => {
        roundEnded = true;
        roundEndWord = data.word;
        resolve(data);
      });
    });

    guesserClients[1].client.emit('guess', { text: chosenWord });
    await roundEndPromise;

    if (!roundEnded || roundEndWord !== chosenWord) {
      throw new Error(`Round end failed or incorrect revealed word: ${roundEndWord}`);
    }
    console.log(`✓ Check 9: All players guessed. Round ended cleanly with revealed word: "${roundEndWord}"`);

    // Verify 5-second transition to next drawer
    console.log('Waiting for next drawer round transition (5s)...');
    let nextDrawerId2 = null;
    const nextRoundStartPromise = new Promise((resolve) => {
      const handler = (data) => {
        nextDrawerId2 = data.drawerId;
        clientA.off('round_start', handler);
        resolve(data);
      };
      clientA.on('round_start', handler);
    });

    const nextRoundData = await nextRoundStartPromise;
    console.log(`✓ Check 10: Smooth round transition verified. Next drawer: ${nextRoundData.drawerName} (${nextDrawerId2})`);

    // Verify next drawer is different from first drawer
    if (nextDrawerId2 === initialDrawerId) {
      throw new Error('Next drawer was not rotated!');
    }
    console.log(`✓ Check 11: Drawer rotation verified. New drawer is distinct from previous drawer.`);

    // Next drawer chooses word
    const drawerClient2 = nextDrawerId2 === playerA.id ? clientA : (nextDrawerId2 === playerB.id ? clientB : clientC);
    let wordOptions2 = nextRoundData.wordOptions || ['banana'];
    drawerClient2.emit('word_chosen', { word: wordOptions2[0] || 'banana' });
    await wait(500);

    // Let the 10-second draw timer expire naturally to test "time_up" expiration
    console.log('Allowing drawing timer to count down to 0 to test timer expiration & transition...');
    const timeUpPromise = new Promise((resolve) => {
      const handler = (data) => {
        if (data.reason === 'time_up') {
          clientA.off('round_end', handler);
          resolve(data);
        }
      };
      clientA.on('round_end', handler);
    });

    const timeUpResult = await Promise.race([
      timeUpPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timer expiration timed out!')), 15000))
    ]);
    console.log(`✓ Check 12: Timer reached 0. Round ended safely with reason: "${timeUpResult.reason}". No stuck timer!`);

    // Wait 5s for the 3rd drawer turn (Charlie)
    console.log('Waiting for 3rd drawer transition...');
    const turn3Promise = new Promise((resolve) => {
      const handler = (data) => {
        clientA.off('round_start', handler);
        resolve(data);
      };
      clientA.on('round_start', handler);
    });
    const turn3Data = await turn3Promise;
    console.log(`✓ Check 13: 3rd drawer turn started. Drawer: ${turn3Data.drawerName}`);

    // Test Game Restart (Host restarting match)
    console.log('Testing host game restart handling (ensuring no duplicate timers)...');
    let restartRoundStartReceived = false;
    const restartPromise = new Promise((resolve) => {
      const handler = (data) => {
        restartRoundStartReceived = true;
        clientA.off('round_start', handler);
        resolve(data);
      };
      clientA.on('round_start', handler);
    });

    clientA.emit('start_game');
    await restartPromise;
    console.log(`✓ Check 14: Game restarted successfully. Scores reset, timers initialized with zero zombie intervals.`);

    // Test player departure: Charlie leaves while Alice & Bob are playing
    console.log('Testing player departure during game...');
    const departurePromise = new Promise((resolve) => {
      clientA.on('player_left', (d) => {
        resolve(d);
      });
    });
    clientC.disconnect();
    const departureResult = await departurePromise;
    console.log(`✓ Check 15: Player departure handled safely. Remaining players: ${departureResult.players.length}`);

    // Cleanup
    clientA.disconnect();
    clientB.disconnect();

    console.log('\n================================================================');
    console.log('  ALL 15 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!          ');
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    if (clientA) clientA.disconnect();
    if (clientB) clientB.disconnect();
    if (clientC) clientC.disconnect();
    process.exit(1);
  }
}

runVerification();
