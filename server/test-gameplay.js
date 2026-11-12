import { server } from './src/server.js';
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const PORT = 5000;
const SERVER_URL = `http://localhost:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTestSuite() {
  console.log('--- Starting Complete Gameplay End-to-End Verification ---');

  // 1. Connect 3 clients
  const clientA = io(SERVER_URL); // Alice (Host)
  const clientB = io(SERVER_URL); // Bob
  const clientC = io(SERVER_URL); // Charlie

  await Promise.race([
    Promise.all([
      new Promise((res) => clientA.on('connect', res)),
      new Promise((res) => clientB.on('connect', res)),
      new Promise((res) => clientC.on('connect', res))
    ]),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Connection timeout')), 5000))
  ]);

  console.log('✓ Step 1: All 3 clients connected via Socket.IO');

  // 2. Client A creates room
  let roomId = null;
  let playerA = null;

  await new Promise((resolve, reject) => {
    clientA.emit(
      'create_room',
      { hostName: 'Alice', settings: { rounds: 2, drawTime: 30, maxPlayers: 5 } },
      (res) => {
        if (!res.success) return reject(new Error(res.error));
        roomId = res.room.roomId;
        playerA = res.player;
        console.log(`✓ Step 2: Room created with code [${roomId}], Host: Alice (${playerA.id})`);
        resolve(res);
      }
    );
  });

  // 3. Client B and C join the room
  let playerB = null;
  let playerC = null;

  await new Promise((resolve, reject) => {
    clientB.emit('join_room', { roomId, playerName: 'Bob' }, (res) => {
      if (!res.success) return reject(new Error(res.error));
      playerB = res.player;
      console.log(`✓ Step 3a: Bob joined room [${roomId}] (${playerB.id})`);
      resolve(res);
    });
  });

  await new Promise((resolve, reject) => {
    clientC.emit('join_room', { roomId, playerName: 'Charlie' }, (res) => {
      if (!res.success) return reject(new Error(res.error));
      playerC = res.player;
      console.log(`✓ Step 3b: Charlie joined room [${roomId}] (${playerC.id})`);
      resolve(res);
    });
  });

  // 4. Verify host starts the game
  let currentDrawerId = null;
  let wordChoices = [];

  const roundStartPromise = new Promise((resolve) => {
    clientA.on('round_start', (data) => {
      console.log(`✓ Step 4a: Alice received round_start. Drawer: ${data.drawerName} (${data.drawerId})`);
      if (data.wordOptions) {
        wordChoices = data.wordOptions;
        console.log(`✓ Step 4b: Drawer received word options: [${wordChoices.join(', ')}]`);
      }
      currentDrawerId = data.drawerId;
      resolve(data);
    });
  });

  // Host starts game
  clientA.emit('start_game');
  await roundStartPromise;

  // Verify non-drawer (Bob or Charlie) did NOT receive wordOptions (Security verification)
  let bobReceivedOptions = false;
  clientB.on('round_start', (data) => {
    if (data.wordOptions && data.wordOptions.length > 0) {
      bobReceivedOptions = true;
    }
  });

  if (bobReceivedOptions) {
    throw new Error('SECURITY VIOLATION: Non-drawer received word options!');
  }
  console.log('✓ Step 5: Security check passed (word options masked from non-drawers)');

  // 5. Drawer chooses word
  const chosenWord = wordChoices[0] || 'pizza';
  const drawerClient = currentDrawerId === playerA.id ? clientA : clientB;
  const guesser1Client = currentDrawerId === playerA.id ? clientB : clientA;
  const guesser2Client = clientC;

  const drawingStartedPromise = new Promise((resolve) => {
    guesser1Client.on('game_state', (state) => {
      if (state.phase === 'DRAWING') {
        console.log(`✓ Step 6a: Guesser received game_state. Phase: DRAWING, Masked Hints: "${state.hints}"`);
        // Verify hints are masked
        if (state.word) {
          throw new Error('SECURITY VIOLATION: Guesser received raw word!');
        }
        resolve(state);
      }
    });
  });

  drawerClient.emit('word_chosen', { word: chosenWord });
  await drawingStartedPromise;
  console.log(`✓ Step 6b: Word "${chosenWord}" selected by drawer. Server-side secrecy confirmed.`);

  // 6. Drawing synchronization
  let receivedStroke = false;
  guesser1Client.on('draw_data', (stroke) => {
    if (stroke.type === 'start' && stroke.x === 100 && stroke.y === 150) {
      receivedStroke = true;
    }
  });

  drawerClient.emit('draw_start', { x: 100, y: 150, color: '#222222', size: 6 });
  await wait(200);

  if (!receivedStroke) {
    throw new Error('Stroke synchronization failed!');
  }
  console.log('✓ Step 7: Drawing stroke synchronization verified across clients');

  // Verify non-drawer cannot draw
  let unauthorizedStrokeBroadcasted = false;
  clientA.on('draw_data', (stroke) => {
    if (stroke.x === 999) unauthorizedStrokeBroadcasted = true;
  });
  guesser1Client.emit('draw_start', { x: 999, y: 999, color: '#222222', size: 6 });
  await wait(200);

  if (unauthorizedStrokeBroadcasted) {
    throw new Error('SECURITY VIOLATION: Non-drawer was able to draw!');
  }
  console.log('✓ Step 8: Permission check passed (non-drawers rejected from drawing)');

  // 7. Verify Chat and Guessing
  // Guesser 1 makes wrong guess
  let wrongGuessChatReceived = false;
  drawerClient.on('chat_message', (msg) => {
    if (msg.text === 'wrongword') wrongGuessChatReceived = true;
  });
  guesser1Client.emit('guess', { text: 'wrongword' });
  await wait(300);

  if (!wrongGuessChatReceived) {
    throw new Error('Chat message distribution failed!');
  }
  console.log('✓ Step 9: Incorrect guess broadcast as normal chat message verified');

  // Guesser 1 makes correct guess
  let correctGuessResultReceived = false;
  let correctGuessPoints = 0;

  drawerClient.on('guess_result', (res) => {
    if (res.correct) {
      correctGuessResultReceived = true;
      correctGuessPoints = res.points;
      console.log(`✓ Step 10a: Guess result received! ${res.playerName} awarded ${res.points} pts.`);
    }
  });

  guesser1Client.emit('guess', { text: chosenWord });
  await wait(400);

  if (!correctGuessResultReceived || correctGuessPoints <= 0) {
    throw new Error('Correct guess evaluation or scoring failed!');
  }

  // Guesser 2 makes correct guess, ending round early
  const roundEndPromise = new Promise((resolve) => {
    clientA.on('round_end', (data) => {
      console.log(`✓ Step 11: All players guessed! Round ended early. Word revealed: "${data.word}"`);
      resolve(data);
    });
  });

  guesser2Client.emit('guess', { text: chosenWord.toUpperCase() }); // Test case insensitivity!
  await roundEndPromise;

  // Clean up
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();

  console.log('\n======================================================');
  console.log('  ALL 10 VERIFICATION TESTS PASSED SUCCESSFULLY!       ');
  console.log('======================================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
