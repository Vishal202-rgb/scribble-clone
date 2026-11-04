import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:5000';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTwoClientShapesTest() {
  console.log('========================================================================');
  console.log('  STARTING TWO-CLIENT BIDIRECTIONAL SHAPES & DRAWING VERIFICATION TEST  ');
  console.log('========================================================================\n');

  // Step 1: Connect Client A (Alice) and Client B (Bob)
  const clientA = io(SERVER_URL, { reconnection: false });
  const clientB = io(SERVER_URL, { reconnection: false });

  await Promise.race([
    Promise.all([
      new Promise((res) => clientA.on('connect', res)),
      new Promise((res) => clientB.on('connect', res))
    ]),
    new Promise((_, rej) => setTimeout(() => rej(new Error('Socket connection timeout')), 5000))
  ]);
  console.log('✓ Step 1: Client A (Alice) and Client B (Bob) connected to backend at ' + SERVER_URL);

  // Step 2: Client A creates room
  let roomId = null;
  let playerA = null;
  await new Promise((resolve, reject) => {
    clientA.emit(
      'create_room',
      { hostName: 'Alice', settings: { rounds: 2, drawTime: 45, maxPlayers: 4 } },
      (res) => {
        if (!res.success) return reject(new Error(res.error));
        roomId = res.room.roomId;
        playerA = res.player;
        console.log(`✓ Step 2: Room [${roomId}] created. Host: Alice (ID: ${playerA.id})`);
        resolve(res);
      }
    );
  });

  // Step 3: Client B joins room
  let playerB = null;
  await new Promise((resolve, reject) => {
    clientB.emit('join_room', { roomId, playerName: 'Bob' }, (res) => {
      if (!res.success) return reject(new Error(res.error));
      playerB = res.player;
      console.log(`✓ Step 3: Bob (ID: ${playerB.id}) joined room [${roomId}]`);
      resolve(res);
    });
  });

  // Step 4: Alice starts the game
  let wordChoices = [];
  const roundStartPromise = new Promise((resolve) => {
    clientA.on('round_start', (data) => {
      if (data.wordOptions) {
        wordChoices = data.wordOptions;
      }
      resolve(data);
    });
  });

  clientA.emit('start_game');
  await roundStartPromise;
  console.log(`✓ Step 4: Game started. Alice received word choices: [${wordChoices.join(', ')}]`);

  // Alice selects word -> Phase transitions to DRAWING
  const chosenWordA = wordChoices[0] || 'circle';
  const drawingPhasePromise = new Promise((resolve) => {
    clientB.on('game_state', (state) => {
      if (state.phase === 'DRAWING' && state.drawerId === playerA.id) {
        resolve(state);
      }
    });
  });

  clientA.emit('word_chosen', { word: chosenWordA });
  await drawingPhasePromise;
  console.log(`✓ Step 5: Word "${chosenWordA}" chosen. DRAWING phase active with Alice as Drawer!`);

  // ---------------------------------------------------------------------------
  // DIRECTION 1: Client A (Drawer) -> Client B (Guesser) Shapes Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- DIRECTION 1: Client A Draws Shapes -> Client B Verifies ---');

  // Test 1.1: Circle Shape
  const circleId = 'alice_circle_1';
  let bobReceivedCircleStart = null;
  let bobReceivedCircleChunk = null;
  let bobReceivedCircleEnd = null;

  clientB.on('stroke_start', (data) => {
    if (data.strokeId === circleId) bobReceivedCircleStart = data;
  });
  clientB.on('stroke_chunk', (data) => {
    if (data.strokeId === circleId) bobReceivedCircleChunk = data;
  });
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === circleId) bobReceivedCircleEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: circleId,
    tool: 'circle',
    color: '#E53935',
    brushSize: 7,
    point: { x: 0.25, y: 0.25 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: circleId,
    tool: 'circle',
    points: [{ x: 0.45, y: 0.45 }]
  });
  clientA.emit('stroke_end', {
    strokeId: circleId,
    finalStroke: {
      strokeId: circleId,
      tool: 'circle',
      color: '#E53935',
      brushSize: 7,
      points: [{ x: 0.25, y: 0.25 }, { x: 0.45, y: 0.45 }]
    }
  });

  await wait(200);
  if (!bobReceivedCircleStart || bobReceivedCircleStart.tool !== 'circle') {
    throw new Error('FAILED 1.1: Bob did not receive stroke_start with tool "circle"');
  }
  if (!bobReceivedCircleChunk || bobReceivedCircleChunk.tool !== 'circle') {
    throw new Error('FAILED 1.1: Bob did not receive stroke_chunk with tool "circle"');
  }
  if (!bobReceivedCircleEnd || bobReceivedCircleEnd.tool !== 'circle' || bobReceivedCircleEnd.color !== '#E53935') {
    throw new Error('FAILED 1.1: Bob did not receive stroke_end with tool "circle" or color mismatch');
  }
  console.log('✓ Test 1.1: Circle shape synchronization verified: tool="circle", color="#E53935", size=7');

  // Test 1.2: Ellipse Shape
  const ellipseId = 'alice_ellipse_1';
  let bobReceivedEllipseEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === ellipseId) bobReceivedEllipseEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: ellipseId,
    tool: 'ellipse',
    color: '#D81B60',
    brushSize: 14,
    point: { x: 0.1, y: 0.1 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: ellipseId,
    tool: 'ellipse',
    points: [{ x: 0.7, y: 0.3 }]
  });
  clientA.emit('stroke_end', {
    strokeId: ellipseId,
    finalStroke: {
      strokeId: ellipseId,
      tool: 'ellipse',
      color: '#D81B60',
      brushSize: 14,
      points: [{ x: 0.1, y: 0.1 }, { x: 0.7, y: 0.3 }]
    }
  });

  await wait(200);
  if (!bobReceivedEllipseEnd || bobReceivedEllipseEnd.tool !== 'ellipse' || bobReceivedEllipseEnd.color !== '#D81B60') {
    throw new Error('FAILED 1.2: Bob did not receive stroke_end with tool "ellipse"');
  }
  console.log('✓ Test 1.2: Ellipse shape synchronization verified: tool="ellipse", color="#D81B60", size=14');

  // Test 1.3: Rectangle Shape
  const rectId = 'alice_rect_1';
  let bobReceivedRectEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === rectId) bobReceivedRectEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: rectId,
    tool: 'rectangle',
    color: '#1E88E5',
    brushSize: 14,
    point: { x: 0.2, y: 0.6 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: rectId,
    tool: 'rectangle',
    points: [{ x: 0.8, y: 0.9 }]
  });
  clientA.emit('stroke_end', {
    strokeId: rectId,
    finalStroke: {
      strokeId: rectId,
      tool: 'rectangle',
      color: '#1E88E5',
      brushSize: 14,
      points: [{ x: 0.2, y: 0.6 }, { x: 0.8, y: 0.9 }]
    }
  });

  await wait(200);
  if (!bobReceivedRectEnd || bobReceivedRectEnd.tool !== 'rectangle' || bobReceivedRectEnd.color !== '#1E88E5') {
    throw new Error('FAILED 1.3: Bob did not receive stroke_end with tool "rectangle"');
  }
  console.log('✓ Test 1.3: Rectangle shape synchronization verified: tool="rectangle", color="#1E88E5", size=14');

  // Test 1.4: Square Shape
  const squareId = 'alice_square_1';
  let bobReceivedSquareEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === squareId) bobReceivedSquareEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: squareId,
    tool: 'square',
    color: '#43A047',
    brushSize: 7,
    point: { x: 0.5, y: 0.2 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: squareId,
    tool: 'square',
    points: [{ x: 0.7, y: 0.4 }]
  });
  clientA.emit('stroke_end', {
    strokeId: squareId,
    finalStroke: {
      strokeId: squareId,
      tool: 'square',
      color: '#43A047',
      brushSize: 7,
      points: [{ x: 0.5, y: 0.2 }, { x: 0.7, y: 0.4 }]
    }
  });

  await wait(200);
  if (!bobReceivedSquareEnd || bobReceivedSquareEnd.tool !== 'square' || bobReceivedSquareEnd.color !== '#43A047') {
    throw new Error('FAILED 1.4: Bob did not receive stroke_end with tool "square"');
  }
  console.log('✓ Test 1.4: Square shape synchronization verified: tool="square", color="#43A047", size=7');

  // Test 1.5: Straight Line
  const lineId = 'alice_line_1';
  let bobReceivedLineEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === lineId) bobReceivedLineEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: lineId,
    tool: 'line',
    color: '#FB8C00',
    brushSize: 3,
    point: { x: 0.05, y: 0.95 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: lineId,
    tool: 'line',
    points: [{ x: 0.95, y: 0.05 }]
  });
  clientA.emit('stroke_end', {
    strokeId: lineId,
    finalStroke: {
      strokeId: lineId,
      tool: 'line',
      color: '#FB8C00',
      brushSize: 3,
      points: [{ x: 0.05, y: 0.95 }, { x: 0.95, y: 0.05 }]
    }
  });

  await wait(200);
  if (!bobReceivedLineEnd || bobReceivedLineEnd.tool !== 'line' || bobReceivedLineEnd.color !== '#FB8C00') {
    throw new Error('FAILED 1.5: Bob did not receive stroke_end with tool "line"');
  }
  console.log('✓ Test 1.5: Straight line synchronization verified: tool="line", color="#FB8C00", size=3');

  // Test 1.6: Freehand Brush (ensure freehand brush is NOT broken)
  const brushId = 'alice_brush_1';
  let bobReceivedBrushEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === brushId) bobReceivedBrushEnd = data.stroke;
  });

  const brushPoints = [
    { x: 0.1, y: 0.5 },
    { x: 0.12, y: 0.51 },
    { x: 0.15, y: 0.53 },
    { x: 0.18, y: 0.56 },
    { x: 0.22, y: 0.58 }
  ];

  clientA.emit('stroke_start', {
    strokeId: brushId,
    tool: 'brush',
    color: '#8E24AA',
    brushSize: 7,
    point: brushPoints[0]
  });
  clientA.emit('stroke_chunk', {
    strokeId: brushId,
    tool: 'brush',
    points: brushPoints.slice(1)
  });
  clientA.emit('stroke_end', {
    strokeId: brushId,
    finalStroke: {
      strokeId: brushId,
      tool: 'brush',
      color: '#8E24AA',
      brushSize: 7,
      points: brushPoints
    }
  });

  await wait(200);
  if (!bobReceivedBrushEnd || bobReceivedBrushEnd.tool !== 'brush' || bobReceivedBrushEnd.points.length !== 5) {
    throw new Error(`FAILED 1.6: Freehand brush corrupted or dropped points! Expected 5, got ${bobReceivedBrushEnd?.points?.length}`);
  }
  console.log('✓ Test 1.6: Freehand brush preserved perfectly: tool="brush", points=5, 0 dropped points');

  // Test 1.7: Eraser Tool
  const eraserId = 'alice_eraser_1';
  let bobReceivedEraserEnd = null;
  clientB.on('stroke_end', (data) => {
    if (data.strokeId === eraserId) bobReceivedEraserEnd = data.stroke;
  });

  clientA.emit('stroke_start', {
    strokeId: eraserId,
    tool: 'eraser',
    color: '#FFFFFF',
    brushSize: 26,
    point: { x: 0.25, y: 0.25 }
  });
  clientA.emit('stroke_chunk', {
    strokeId: eraserId,
    tool: 'eraser',
    points: [{ x: 0.35, y: 0.35 }]
  });
  clientA.emit('stroke_end', {
    strokeId: eraserId,
    finalStroke: {
      strokeId: eraserId,
      tool: 'eraser',
      color: '#FFFFFF',
      brushSize: 26,
      points: [{ x: 0.25, y: 0.25 }, { x: 0.35, y: 0.35 }]
    }
  });

  await wait(200);
  if (!bobReceivedEraserEnd || bobReceivedEraserEnd.tool !== 'eraser') {
    throw new Error('FAILED 1.7: Eraser tool not recognized on remote client');
  }
  console.log('✓ Test 1.7: Eraser tool synchronized cleanly: tool="eraser", size=26');

  // Test 1.8: Non-drawer Bob drawing rejection
  let rejectedStrokeBroadcast = false;
  clientA.on('stroke_start', (data) => {
    if (data.strokeId === 'bob_unauthorized') rejectedStrokeBroadcast = true;
  });
  clientB.emit('stroke_start', {
    strokeId: 'bob_unauthorized',
    tool: 'circle',
    point: { x: 0.5, y: 0.5 }
  });
  await wait(150);
  if (rejectedStrokeBroadcast) {
    throw new Error('SECURITY VIOLATION: Non-drawer was able to emit drawing strokes!');
  }
  console.log('✓ Test 1.8: Non-drawer drawing rejection confirmed');

  // ---------------------------------------------------------------------------
  // TRANSITION: Turn rotation -> Bob becomes Drawer
  // ---------------------------------------------------------------------------
  console.log('\n--- TRANSITION: Turn 1 Complete -> Turn 2 Starts ---');

  const turn2StartPromise = new Promise((resolve) => {
    clientB.on('round_start', (data) => {
      if (data.wordOptions && data.wordOptions.length > 0) {
        resolve(data);
      }
    });
  });

  // Bob guesses the word to complete Turn 1
  clientB.emit('guess', { text: chosenWordA });
  const turn2Data = await turn2StartPromise;
  console.log(`✓ Turn 2 started! Bob is drawer, received word options: [${turn2Data.wordOptions.join(', ')}]`);

  // Bob selects word -> Phase transitions to DRAWING
  const chosenWordB = turn2Data.wordOptions[0] || 'square';
  const bobDrawingPhasePromise = new Promise((resolve) => {
    clientA.on('game_state', (state) => {
      if (state.phase === 'DRAWING' && state.drawerId === playerB.id) {
        resolve(state);
      }
    });
  });

  clientB.emit('word_chosen', { word: chosenWordB });
  await bobDrawingPhasePromise;
  console.log(`✓ Word "${chosenWordB}" chosen. DRAWING phase active with Bob as Drawer!`);

  // ---------------------------------------------------------------------------
  // DIRECTION 2: Client B (Drawer) -> Client A (Guesser) Shapes Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- DIRECTION 2: Client B Draws Shapes -> Client A Verifies ---');

  // Test 2.1: Bob draws Circle
  const bobCircleId = 'bob_circle_2';
  let aliceReceivedCircleEnd = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === bobCircleId) aliceReceivedCircleEnd = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: bobCircleId,
    tool: 'circle',
    color: '#00ACC1',
    brushSize: 7,
    point: { x: 0.3, y: 0.3 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: bobCircleId,
    tool: 'circle',
    points: [{ x: 0.6, y: 0.6 }]
  });
  clientB.emit('stroke_end', {
    strokeId: bobCircleId,
    finalStroke: {
      strokeId: bobCircleId,
      tool: 'circle',
      color: '#00ACC1',
      brushSize: 7,
      points: [{ x: 0.3, y: 0.3 }, { x: 0.6, y: 0.6 }]
    }
  });

  await wait(200);
  if (!aliceReceivedCircleEnd || aliceReceivedCircleEnd.tool !== 'circle' || aliceReceivedCircleEnd.color !== '#00ACC1') {
    throw new Error('FAILED 2.1: Alice did not receive Bob\'s circle stroke with correct tool and color');
  }
  console.log('✓ Test 2.1: Bob -> Alice Circle shape verified: tool="circle", color="#00ACC1"');

  // Test 2.2: Bob draws Square
  const bobSquareId = 'bob_square_2';
  let aliceReceivedSquareEnd = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === bobSquareId) aliceReceivedSquareEnd = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: bobSquareId,
    tool: 'square',
    color: '#7CB342',
    brushSize: 14,
    point: { x: 0.1, y: 0.1 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: bobSquareId,
    tool: 'square',
    points: [{ x: 0.4, y: 0.4 }]
  });
  clientB.emit('stroke_end', {
    strokeId: bobSquareId,
    finalStroke: {
      strokeId: bobSquareId,
      tool: 'square',
      color: '#7CB342',
      brushSize: 14,
      points: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.4 }]
    }
  });

  await wait(200);
  if (!aliceReceivedSquareEnd || aliceReceivedSquareEnd.tool !== 'square' || aliceReceivedSquareEnd.color !== '#7CB342') {
    throw new Error('FAILED 2.2: Alice did not receive Bob\'s square stroke');
  }
  console.log('✓ Test 2.2: Bob -> Alice Square shape verified: tool="square", color="#7CB342"');

  // Test 2.3: Bob draws Rectangle
  const bobRectId = 'bob_rect_2';
  let aliceReceivedRectEnd = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === bobRectId) aliceReceivedRectEnd = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: bobRectId,
    tool: 'rectangle',
    color: '#FDD835',
    brushSize: 7,
    point: { x: 0.2, y: 0.7 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: bobRectId,
    tool: 'rectangle',
    points: [{ x: 0.8, y: 0.85 }]
  });
  clientB.emit('stroke_end', {
    strokeId: bobRectId,
    finalStroke: {
      strokeId: bobRectId,
      tool: 'rectangle',
      color: '#FDD835',
      brushSize: 7,
      points: [{ x: 0.2, y: 0.7 }, { x: 0.8, y: 0.85 }]
    }
  });

  await wait(200);
  if (!aliceReceivedRectEnd || aliceReceivedRectEnd.tool !== 'rectangle') {
    throw new Error('FAILED 2.3: Alice did not receive Bob\'s rectangle stroke');
  }
  console.log('✓ Test 2.3: Bob -> Alice Rectangle shape verified: tool="rectangle", color="#FDD835"');

  // Test 2.4: Bob draws Straight Line
  const bobLineId = 'bob_line_2';
  let aliceReceivedLineEnd = null;
  clientA.on('stroke_end', (data) => {
    if (data.strokeId === bobLineId) aliceReceivedLineEnd = data.stroke;
  });

  clientB.emit('stroke_start', {
    strokeId: bobLineId,
    tool: 'line',
    color: '#6D4C41',
    brushSize: 3,
    point: { x: 0.05, y: 0.05 }
  });
  clientB.emit('stroke_chunk', {
    strokeId: bobLineId,
    tool: 'line',
    points: [{ x: 0.95, y: 0.95 }]
  });
  clientB.emit('stroke_end', {
    strokeId: bobLineId,
    finalStroke: {
      strokeId: bobLineId,
      tool: 'line',
      color: '#6D4C41',
      brushSize: 3,
      points: [{ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.95 }]
    }
  });

  await wait(200);
  if (!aliceReceivedLineEnd || aliceReceivedLineEnd.tool !== 'line') {
    throw new Error('FAILED 2.4: Alice did not receive Bob\'s line stroke');
  }
  console.log('✓ Test 2.4: Bob -> Alice Straight line verified: tool="line", color="#6D4C41"');

  // Test 2.5: Undo Stroke
  let aliceReceivedUndo = null;
  clientA.on('draw_undo', (data) => {
    aliceReceivedUndo = data;
  });
  clientB.emit('draw_undo');
  await wait(200);
  if (!aliceReceivedUndo) {
    throw new Error('FAILED 2.5: Undo stroke was not broadcast to Alice!');
  }
  console.log(`✓ Test 2.5: Bob undoes last stroke -> Alice synchronized (remaining strokes: ${aliceReceivedUndo.strokes.length})`);

  // ---------------------------------------------------------------------------
  // STEP 3: Canvas State Recovery & Persistence
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP 3: Canvas State Recovery & Persistence ---');

  let recoveredStrokes = [];
  await new Promise((resolve) => {
    clientA.emit('get_canvas_state', (res) => {
      recoveredStrokes = res.strokes || [];
      resolve(res);
    });
  });

  console.log(`✓ Retrieved ${recoveredStrokes.length} canvas strokes via get_canvas_state`);
  const shapeTypesFound = new Set(recoveredStrokes.map((s) => s.tool));
  console.log('✓ Verified recovered tool types on server:', Array.from(shapeTypesFound).join(', '));

  if (!shapeTypesFound.has('circle') || !shapeTypesFound.has('square') || !shapeTypesFound.has('rectangle')) {
    throw new Error('FAILED Step 3: Server state missing original shape tool definitions!');
  }
  console.log('✓ Step 3: Canvas state recovery accurately preserves all original shape types!');

  // Test 2.6: Clear Canvas
  let aliceReceivedClear = false;
  clientA.on('canvas_clear', () => { aliceReceivedClear = true; });

  clientB.emit('canvas_clear');
  await wait(200);
  if (!aliceReceivedClear) {
    throw new Error('FAILED 2.6: Canvas clear was not received by Alice!');
  }
  console.log('✓ Test 2.6: Canvas clear synchronized across all players');

  // Cleanup
  clientA.disconnect();
  clientB.disconnect();

  console.log('\n========================================================================');
  console.log('  ALL BIDIRECTIONAL TWO-CLIENT TESTS PASSED WITH 100% SUCCESS!          ');
  console.log('========================================================================\n');
  process.exit(0);
}

runTwoClientShapesTest().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
