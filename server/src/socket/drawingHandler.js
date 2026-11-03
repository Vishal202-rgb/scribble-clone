import { roomStore } from '../utils/roomStore.js';

/**
 * Handles real-time drawing strokes and canvas synchronization
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerDrawingHandler(io, socket) {
  // Temporary active stroke buffer per socket
  let currentStroke = null;

  /**
   * Helper to validate that socket is the authorized current drawer
   */
  function validateDrawer() {
    const mapping = roomStore.getSocketMapping(socket.id);
    if (!mapping) return null;

    const room = roomStore.getRoom(mapping.roomId);
    if (!room || !room.game) return null;

    if (room.game.phase !== 'DRAWING') return null;
    if (room.game.currentDrawerId !== mapping.playerId) return null;

    return { room, game: room.game };
  }

  /**
   * Drawer starts a stroke
   * Payload: { x: number, y: number, color: string, size: number }
   */
  socket.on('draw_start', (payload = {}) => {
    const context = validateDrawer();
    if (!context) return;

    const { x, y, color = '#222222', size = 4 } = payload;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    currentStroke = {
      type: 'stroke',
      color,
      size: Math.min(Math.max(Number(size) || 4, 1), 60),
      points: [{ x, y }]
    };

    // Broadcast stroke start to everyone in room
    io.to(context.room.id).emit('draw_data', {
      type: 'start',
      x,
      y,
      color: currentStroke.color,
      size: currentStroke.size
    });
  });

  /**
   * Drawer continues drawing
   * Payload: { x: number, y: number }
   */
  socket.on('draw_move', (payload = {}) => {
    const context = validateDrawer();
    if (!context || !currentStroke) return;

    const { x, y } = payload;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    currentStroke.points.push({ x, y });

    // Broadcast coordinate step to everyone in room
    io.to(context.room.id).emit('draw_data', {
      type: 'move',
      x,
      y
    });
  });

  /**
   * Drawer finishes stroke
   */
  socket.on('draw_end', () => {
    const context = validateDrawer();
    if (!context) {
      currentStroke = null;
      return;
    }

    if (currentStroke) {
      context.game.strokes.push(currentStroke);
      currentStroke = null;
    }

    io.to(context.room.id).emit('draw_data', {
      type: 'end'
    });
  });

  /**
   * Drawer clears entire canvas
   */
  socket.on('canvas_clear', () => {
    const context = validateDrawer();
    if (!context) return;

    context.game.strokes = [];
    currentStroke = null;

    io.to(context.room.id).emit('canvas_clear');
  });

  /**
   * Drawer undos last stroke
   */
  socket.on('draw_undo', () => {
    const context = validateDrawer();
    if (!context) return;

    if (context.game.strokes.length > 0) {
      context.game.strokes.pop();
    }

    // Broadcast undo and stroke history to re-render clean state
    io.to(context.room.id).emit('draw_undo', {
      strokes: context.game.strokes
    });
  });
}
