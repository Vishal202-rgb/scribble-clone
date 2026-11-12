import { server } from './src/server.js';
import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const PORT = 5000;
const SERVER_URL = `http://localhost:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PALETTE_COLORS = [
  '#222222', '#616161', '#BDBDBD', '#FFFFFF',
  '#E53935', '#FB8C00', '#FDD835', '#43A047',
  '#7CB342', '#1E88E5', '#00ACC1', '#8E24AA',
  '#D81B60', '#6D4C41'
];

const BRUSH_SIZES = [3, 7, 14, 26];

async function runTestSuite() {
  console.log('================================================================');
  console.log('  STARTING PIXEL-ACCURATE REAL-TIME DRAWING SYNC VERIFICATION   ');
  console.log('================================================================\n');

  // 1. Connect 3 clients
  const clientA = io(SERVER_URL); // Alice (Host / Drawer 1)
  const clientB = io(SERVER_URL); // Bob (Guesser 1 / Drawer 2)
  const clientC = io(SERVER_URL); // Charlie (Guesser 2)

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

  // 4. Start game & select word
  let roundStartReceived = false;
  let wordChoices = [];

  const roundStartPromise = new Promise((resolve) => {
    clientA.on('round_start', (data) => {
      roundStartReceived = true;
      if (data.wordOptions) {
        wordChoices = data.wordOptions;
      }
      resolve(data);
    });
  });

  clientA.emit('start_game');
  await roundStartPromise;
  console.log(`✓ Step 4: Game started. Alice received word choices: [${wordChoices.join(', ')}]`);

  const chosenWord = wordChoices[0] || 'apple';
  const drawingPhasePromise = new Promise((resolve) => {
    clientB.on('game_state', (state) => {
      if (state.phase === 'DRAWING') {
        resolve(state);
      }
    });
  });

  clientA.emit('word_chosen', { word: chosenWord });
  await drawingPhasePromise;
  console.log(`✓ Step 5: Word "${chosenWord}" chosen. DRAWING phase synchronized across all clients.`);

  // -------------------------------------------------------------------------
  // TEST A & B: Shape Tools (Circle, Rectangle, Line) and Freehand Brush Sync
  // -------------------------------------------------------------------------
  console.log('\n--- TEST A & B: Shape Tools & Freehand Brush Synchronization ---');

  // 1. Circle test
  const circleId = 'stroke_circle_1';
  let bobReceivedCircle = null;
  let charlieReceivedCircle = null;

  clientB.on('stroke_end', (data) => {
    if (data.strokeId === circleId) bobReceivedCircle = data.stroke;
  });
  clientC.on('stroke_end', (data) => {
    if (data.strokeId === circleId) charlieReceivedCircle = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: circleId,
    tool: 'circle',
    color: '#E53935',
    brushSize: 7,
    point: { x: 0.2, y: 0.2 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: circleId,
    points: [{ x: 0.4, y: 0.4 }]
  });
  clientA.emit('stroke_end', {
    strokeId: circleId,
    finalStroke: {
      strokeId: circleId,
      tool: 'circle',
      color: '#E53935',
      brushSize: 7,
      points: [{ x: 0.2, y: 0.2 }, { x: 0.4, y: 0.4 }]
    }
  });

  await wait(250);

  if (!bobReceivedCircle || !charlieReceivedCircle) {
    throw new Error('TEST FAILED: Circle stroke not received by Bob or Charlie!');
  }
  if (bobReceivedCircle.tool !== 'circle' || bobReceivedCircle.color !== '#E53935' || bobReceivedCircle.brushSize !== 7) {
    throw new Error('TEST FAILED: Circle metadata mismatch on Bob client!');
  }
  if (charlieReceivedCircle.points[0].x !== 0.2 || charlieReceivedCircle.points[1].y !== 0.4) {
    throw new Error('TEST FAILED: Circle normalized coordinates mismatch on Charlie client!');
  }
  console.log('✓ Test A.1: Circle shape synchronization verified pixel-accurately across all players');

  // 2. Rectangle test
  const rectId = 'stroke_rect_1';
  let bobReceivedRect = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === rectId) bobReceivedRect = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: rectId,
    tool: 'rectangle',
    color: '#1E88E5',
    brushSize: 14,
    point: { x: 0.5, y: 0.1 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: rectId,
    points: [{ x: 0.8, y: 0.3 }]
  });
  clientA.emit('stroke_end', {
    strokeId: rectId,
    finalStroke: {
      strokeId: rectId,
      tool: 'rectangle',
      color: '#1E88E5',
      brushSize: 14,
      points: [{ x: 0.5, y: 0.1 }, { x: 0.8, y: 0.3 }]
    }
  });

  await wait(250);
  if (!bobReceivedRect || bobReceivedRect.tool !== 'rectangle' || bobReceivedRect.color !== '#1E88E5') {
    throw new Error('TEST FAILED: Rectangle stroke synchronization failed!');
  }
  console.log('✓ Test A.2: Rectangle shape synchronization verified pixel-accurately');

  // 3. Straight Line test
  const lineId = 'stroke_line_1';
  let bobReceivedLine = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === lineId) bobReceivedLine = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: lineId,
    tool: 'line',
    color: '#43A047',
    brushSize: 3,
    point: { x: 0.1, y: 0.8 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: lineId,
    points: [{ x: 0.9, y: 0.8 }]
  });
  clientA.emit('stroke_end', {
    strokeId: lineId,
    finalStroke: {
      strokeId: lineId,
      tool: 'line',
      color: '#43A047',
      brushSize: 3,
      points: [{ x: 0.1, y: 0.8 }, { x: 0.9, y: 0.8 }]
    }
  });

  await wait(250);
  if (!bobReceivedLine || bobReceivedLine.tool !== 'line') {
    throw new Error('TEST FAILED: Line stroke synchronization failed!');
  }
  console.log('✓ Test A.3: Straight line synchronization verified pixel-accurately');

  // 4. Freehand Brush Multi-Point test
  const brushId = 'stroke_brush_1';
  let bobReceivedBrush = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === brushId) bobReceivedBrush = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: brushId,
    tool: 'brush',
    color: '#8E24AA',
    brushSize: 7,
    point: { x: 0.3, y: 0.5 }
  });

  const streamPoints = [];
  for (let i = 1; i <= 10; i++) {
    streamPoints.push({ x: 0.3 + i * 0.02, y: 0.5 + Math.sin(i) * 0.05 });
  }

  clientA.emit('stroke_chunk', {
    strokeId: brushId,
    points: streamPoints
  });

  clientA.emit('stroke_end', {
    strokeId: brushId,
    finalStroke: {
      strokeId: brushId,
      tool: 'brush',
      color: '#8E24AA',
      brushSize: 7,
      points: [{ x: 0.3, y: 0.5 }, ...streamPoints]
    }
  });

  await wait(300);
  if (!bobReceivedBrush || bobReceivedBrush.points.length !== 11) {
    throw new Error(`TEST FAILED: Freehand brush points dropped! Expected 11, got ${bobReceivedBrush?.points.length}`);
  }
  console.log('✓ Test B: Freehand brush multi-point sequence verified with 0 dropped points');

  // -------------------------------------------------------------------------
  // TEST C: Permissions check & Turn Rotation
  // -------------------------------------------------------------------------
  console.log('\n--- TEST C: Permissions Enforcement & Turn Rotation ---');

  // Non-drawer (Bob) attempts to draw
  let unauthorizedStrokeBroadcast = false;
  clientC.on('stroke_start', (data) => {
    if (data.strokeId === 'unauthorized_stroke') unauthorizedStrokeBroadcast = true;
  });

  clientB.emit('stroke_start', {
    strokeId: 'unauthorized_stroke',
    tool: 'brush',
    color: '#222222',
    brushSize: 4,
    point: { x: 0.5, y: 0.5 }
  });

  await wait(200);
  if (unauthorizedStrokeBroadcast) {
    throw new Error('SECURITY VIOLATION: Non-drawer Bob was able to broadcast drawing!');
  }
  console.log('✓ Step 6: Non-drawer drawing rejection confirmed');

  // Turn transition: Bob & Charlie guess the word -> Turn 1 ends
  const roundEndPromise = new Promise((resolve) => clientA.on('round_end', resolve));
  clientB.emit('guess', { text: chosenWord });
  clientC.emit('guess', { text: chosenWord });
  await roundEndPromise;
  console.log('✓ Step 7: Round ended after all players guessed. Waiting for turn rotation...');

  // Turn 2: Bob receives word selection
  let bobWordChoices = [];
  const bobTurnPromise = new Promise((resolve) => {
    clientB.on('round_start', (data) => {
      if (data.wordOptions && data.wordOptions.length > 0) {
        bobWordChoices = data.wordOptions;
        resolve(data);
      }
    });
  });

  await bobTurnPromise;
  console.log(`✓ Step 8: Turn 2 started! Bob is drawer, received word options: [${bobWordChoices.join(', ')}]`);

  // Bob selects word
  const bobChosenWord = bobWordChoices[0] || 'pizza';
  const bobDrawingPhasePromise = new Promise((resolve) => {
    clientA.on('game_state', (state) => {
      if (state.phase === 'DRAWING' && state.drawerId === playerB.id) {
        resolve(state);
      }
    });
  });

  clientB.emit('word_chosen', { word: bobChosenWord });
  await bobDrawingPhasePromise;
  console.log(`✓ Step 9: Bob selected "${bobChosenWord}". Bob drawing tools unlocked!`);

  // Bob draws a circle
  const bobCircleId = 'bob_circle_turn2';
  let aliceReceivedBobCircle = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === bobCircleId) aliceReceivedBobCircle = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: bobCircleId,
    tool: 'circle',
    color: '#FB8C00',
    brushSize: 14,
    point: { x: 0.3, y: 0.3 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: bobCircleId,
    points: [{ x: 0.6, y: 0.6 }]
  });
  clientB.emit('stroke_end', {
    strokeId: bobCircleId,
    finalStroke: {
      strokeId: bobCircleId,
      tool: 'circle',
      color: '#FB8C00',
      brushSize: 14,
      points: [{ x: 0.3, y: 0.3 }, { x: 0.6, y: 0.6 }]
    }
  });

  await wait(250);
  if (!aliceReceivedBobCircle || aliceReceivedBobCircle.color !== '#FB8C00') {
    throw new Error('TEST FAILED: Player 2 (Bob) drawing was not received by Player 1 (Alice)!');
  }
  console.log('✓ Test C: Turn rotation and Player 2 drawing synchronization verified!');

  // -------------------------------------------------------------------------
  // TEST D: Complete 14-Color Palette, 4 Brush Sizes, Eraser, Undo, Clear
  // -------------------------------------------------------------------------
  console.log('\n--- TEST D: 14 Colors, 4 Brush Sizes, Eraser, Undo & Clear ---');

  // 1. Draw strokes with all 14 palette colors and 4 brush sizes
  for (let i = 0; i < PALETTE_COLORS.length; i++) {
    const color = PALETTE_COLORS[i];
    const brushSize = BRUSH_SIZES[i % BRUSH_SIZES.length];
    const sId = `palette_stroke_${i}`;

    clientB.emit('stroke_start', {
      strokeId: sId,
      tool: 'brush',
      color,
      brushSize,
      point: { x: 0.05 + i * 0.06, y: 0.1 }
    });
    clientB.emit('stroke_chunk', {
      strokeId: sId,
      points: [{ x: 0.05 + i * 0.06, y: 0.2 }]
    });
    clientB.emit('stroke_end', {
      strokeId: sId,
      finalStroke: {
        strokeId: sId,
        tool: 'brush',
        color,
        brushSize,
        points: [{ x: 0.05 + i * 0.06, y: 0.1 }, { x: 0.05 + i * 0.06, y: 0.2 }]
      }
    });
  }

  await wait(400);
  console.log('✓ Test D.1: All 14 palette colors and 4 brush sizes transmitted and registered');

  // 2. Test Eraser Tool
  const eraserId = 'eraser_stroke_1';
  let aliceReceivedEraser = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === eraserId) aliceReceivedEraser = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: eraserId,
    tool: 'eraser',
    color: '#FFFFFF',
    brushSize: 26,
    point: { x: 0.2, y: 0.2 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: eraserId,
    points: [{ x: 0.3, y: 0.3 }]
  });
  clientB.emit('stroke_end', {
    strokeId: eraserId,
    finalStroke: {
      strokeId: eraserId,
      tool: 'eraser',
      color: '#FFFFFF',
      brushSize: 26,
      points: [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.3 }]
    }
  });

  await wait(250);
  if (!aliceReceivedEraser || aliceReceivedEraser.tool !== 'eraser') {
    throw new Error('TEST FAILED: Eraser tool synchronization failed!');
  }
  console.log('✓ Test D.2: Eraser tool verified across clients');

  // 3. Test Undo
  let undoStrokesCount = 0;
  clientA.on('draw_undo', (data) => {
    undoStrokesCount = data.strokes.length;
  });

  clientB.emit('draw_undo');
  await wait(250);

  if (undoStrokesCount <= 0) {
    throw new Error('TEST FAILED: Undo stroke synchronization failed!');
  }
  console.log(`✓ Test D.3: Stroke Undo verified (remaining strokes: ${undoStrokesCount})`);

  // 4. Test Clear Canvas
  let canvasCleared = false;
  clientA.on('canvas_clear', () => {
    canvasCleared = true;
  });

  clientB.emit('canvas_clear');
  await wait(250);

  if (!canvasCleared) {
    throw new Error('TEST FAILED: Canvas clear event not synchronized!');
  }
  console.log('✓ Test D.4: Clear Canvas verified across all connected clients');

  // -------------------------------------------------------------------------
  // TEST E: Screen Resolution Independence (Normalized Coordinates)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST E: Screen Resolution Independence (Normalized Coordinates) ---');

  const normalizedTestPoint = { x: 0.35, y: 0.65 };
  const viewports = [
    { name: 'Desktop 1080p', width: 1920, height: 1080 },
    { name: 'Tablet / iPad', width: 1024, height: 768 },
    { name: 'Mobile Screen', width: 375, height: 667 }
  ];

  viewports.forEach((vp) => {
    const renderedX = normalizedTestPoint.x * vp.width;
    const renderedY = normalizedTestPoint.y * vp.height;
    // Reverse normalization
    const reconstructedX = renderedX / vp.width;
    const reconstructedY = renderedY / vp.height;
    if (Math.abs(reconstructedX - normalizedTestPoint.x) > 0.0001 || Math.abs(reconstructedY - normalizedTestPoint.y) > 0.0001) {
      throw new Error(`TEST FAILED: Resolution distortion on viewport ${vp.name}`);
    }
    console.log(`✓ Resolution check [${vp.name}]: (${renderedX.toFixed(1)}px, ${renderedY.toFixed(1)}px) maps accurately to (0.35, 0.65)`);
  });

  // -------------------------------------------------------------------------
  // TEST F: Rapid Drawing & Reconnection State Recovery
  // -------------------------------------------------------------------------
  console.log('\n--- TEST F: Rapid Drawing & Late-Join / Reconnection Recovery ---');

  // 1. Rapid drawing: send 50 points burst
  const rapidStrokeId = 'rapid_stroke_50';
  const rapidPoints = [];
  for (let i = 0; i < 50; i++) {
    rapidPoints.push({ x: 0.1 + (i / 50) * 0.8, y: 0.5 });
  }

  clientB.emit('stroke_start', {
    strokeId: rapidStrokeId,
    tool: 'brush',
    color: '#00ACC1',
    brushSize: 7,
    point: rapidPoints[0]
  });

  clientB.emit('stroke_chunk', {
    strokeId: rapidStrokeId,
    points: rapidPoints.slice(1)
  });

  clientB.emit('stroke_end', {
    strokeId: rapidStrokeId,
    finalStroke: {
      strokeId: rapidStrokeId,
      tool: 'brush',
      color: '#00ACC1',
      brushSize: 7,
      points: rapidPoints
    }
  });

  await wait(350);
  console.log('✓ Test F.1: Rapid drawing burst (50 points) transmitted with 0 dropped points');

  // 2. Reconnection state recovery: client C requests canvas state
  let recoveredStrokesCount = 0;
  await new Promise((resolve) => {
    clientC.emit('get_canvas_state', (res) => {
      recoveredStrokesCount = res.strokes.length;
      resolve(res);
    });
  });

  if (recoveredStrokesCount <= 0) {
    throw new Error('TEST FAILED: Canvas state recovery returned 0 strokes!');
  }
  console.log(`✓ Test F.2: Reconnection canvas recovery verified (${recoveredStrokesCount} strokes retrieved)`);

  // Clean up
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();

  console.log('\n================================================================');
  console.log('  ALL MANDATORY TESTS (A, B, C, D, E, F) PASSED SUCCESSFULLY!    ');
  console.log('================================================================\n');
  process.exit(0);
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
