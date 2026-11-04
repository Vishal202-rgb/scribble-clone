import { roomStore } from '../utils/roomStore.js';

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function sanitizePoint(pt) {
  if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return null;
  // If pt is in [0, 1] keep as is, if > 1 (legacy 800/1000 pixel), normalize
  const x = pt.x > 1 ? pt.x / 1000 : pt.x;
  const y = pt.y > 1 ? pt.y / 750 : pt.y;
  return {
    x: Math.round(clamp(x, 0, 1) * 10000) / 10000,
    y: Math.round(clamp(y, 0, 1) * 10000) / 10000
  };
}

const VALID_TOOLS = ['brush', 'circle', 'ellipse', 'rectangle', 'square', 'line', 'eraser'];

/**
 * Handles real-time drawing strokes and canvas synchronization
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export function registerDrawingHandler(io, socket) {
  // Active stroke buffer per socket
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

    return { room, game: room.game, playerId: mapping.playerId };
  }

  /**
   * High-Precision Stroke Start
   * Payload: { strokeId, tool, color, brushSize, point: { x, y }, sequence, timestamp }
   */
  socket.on('stroke_start', (payload = {}) => {
    const context = validateDrawer();
    if (!context) return;

    const strokeId = payload.strokeId || `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tool = VALID_TOOLS.includes(payload.tool) ? payload.tool : 'brush';
    const color = typeof payload.color === 'string' ? payload.color : '#222222';
    const brushSize = Math.min(Math.max(Number(payload.brushSize) || 4, 1), 60);
    const startPoint = sanitizePoint(payload.point || { x: payload.x, y: payload.y });
    if (!startPoint) return;

    currentStroke = {
      strokeId,
      playerId: context.playerId,
      tool,
      color,
      brushSize,
      points: [startPoint],
      timestamp: Number(payload.timestamp) || Date.now(),
      sequence: Number(payload.sequence) || 0,
      isHighPrecision: true
    };

    io.to(context.room.id).emit('stroke_start', {
      strokeId,
      playerId: context.playerId,
      tool,
      color,
      brushSize,
      point: startPoint,
      sequence: currentStroke.sequence,
      timestamp: currentStroke.timestamp
    });

    // Backward compatibility with legacy draw_data listeners
    io.to(context.room.id).emit('draw_data', {
      type: 'start',
      strokeId,
      tool,
      x: startPoint.x * 1000,
      y: startPoint.y * 750,
      color,
      size: brushSize
    });
  });

  /**
   * High-Precision Stroke Chunk (Batched or Single Points)
   * Payload: { strokeId, tool?, points: [{ x, y }], sequence }
   */
  socket.on('stroke_chunk', (payload = {}) => {
    const context = validateDrawer();
    if (!context || !currentStroke) return;
    if (payload.strokeId && payload.strokeId !== currentStroke.strokeId) return;

    if (payload.tool && VALID_TOOLS.includes(payload.tool)) {
      currentStroke.tool = payload.tool;
    }

    const rawPoints = Array.isArray(payload.points) ? payload.points : (payload.point ? [payload.point] : []);
    const sanitized = [];
    for (const p of rawPoints) {
      const sp = sanitizePoint(p);
      if (sp) {
        sanitized.push(sp);
        currentStroke.points.push(sp);
      }
    }

    if (sanitized.length === 0) return;

    const sequence = Number(payload.sequence) || currentStroke.points.length;

    io.to(context.room.id).emit('stroke_chunk', {
      strokeId: currentStroke.strokeId,
      playerId: context.playerId,
      tool: currentStroke.tool,
      color: currentStroke.color,
      brushSize: currentStroke.brushSize,
      points: sanitized,
      sequence
    });

    // Backward compatibility with legacy draw_data listeners
    const last = sanitized[sanitized.length - 1];
    io.to(context.room.id).emit('draw_data', {
      type: 'move',
      strokeId: currentStroke.strokeId,
      tool: currentStroke.tool,
      x: last.x * 1000,
      y: last.y * 750
    });
  });

  /**
   * High-Precision Stroke End
   * Payload: { strokeId, finalStroke?: object }
   */
  socket.on('stroke_end', (payload = {}) => {
    const context = validateDrawer();
    if (!context) {
      currentStroke = null;
      return;
    }

    if (currentStroke) {
      if (payload.finalStroke) {
        if (payload.finalStroke.tool && VALID_TOOLS.includes(payload.finalStroke.tool)) {
          currentStroke.tool = payload.finalStroke.tool;
        }
        if (payload.finalStroke.color) {
          currentStroke.color = payload.finalStroke.color;
        }
        if (typeof payload.finalStroke.brushSize === 'number') {
          currentStroke.brushSize = payload.finalStroke.brushSize;
        }
        if (Array.isArray(payload.finalStroke.points)) {
          const finalPts = payload.finalStroke.points.map(sanitizePoint).filter(Boolean);
          if (finalPts.length > 0) {
            currentStroke.points = finalPts;
          }
        }
      }

      context.game.strokes.push(currentStroke);
      const finished = { ...currentStroke };
      currentStroke = null;

      io.to(context.room.id).emit('stroke_end', {
        strokeId: finished.strokeId,
        stroke: finished
      });
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
   * Drawer undoes last stroke
   */
  socket.on('draw_undo', () => {
    const context = validateDrawer();
    if (!context) return;

    if (context.game.strokes.length > 0) {
      context.game.strokes.pop();
    }

    io.to(context.room.id).emit('draw_undo', {
      strokes: context.game.strokes
    });
  });

  /**
   * Reconnection / Late-join Canvas State Recovery
   */
  socket.on('get_canvas_state', (callback) => {
    const mapping = roomStore.getSocketMapping(socket.id);
    if (!mapping) return;
    const room = roomStore.getRoom(mapping.roomId);
    if (!room || !room.game) return;

    const strokes = room.game.strokes || [];
    if (typeof callback === 'function') {
      callback({ success: true, strokes });
    }
    socket.emit('canvas_state', { strokes });
  });

  /**
   * Legacy draw_start adapter
   */
  socket.on('draw_start', (payload = {}) => {
    const context = validateDrawer();
    if (!context) return;

    // If socket is already in a high-precision stroke, ignore duplicate legacy draw_start
    if (currentStroke && currentStroke.isHighPrecision) {
      return;
    }

    const { x, y, color = '#222222', size = 4 } = payload;
    const tool = VALID_TOOLS.includes(payload.tool) ? payload.tool : 'brush';
    if (typeof x !== 'number' || typeof y !== 'number') return;

    const pt = sanitizePoint({ x, y });
    if (!pt) return;

    const strokeId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    currentStroke = {
      strokeId,
      playerId: context.playerId,
      tool,
      color,
      brushSize: Math.min(Math.max(Number(size) || 4, 1), 60),
      points: [pt],
      timestamp: Date.now(),
      sequence: 0,
      isHighPrecision: false
    };

    io.to(context.room.id).emit('stroke_start', {
      strokeId,
      playerId: context.playerId,
      tool,
      color,
      brushSize: currentStroke.brushSize,
      point: pt,
      sequence: 0,
      timestamp: currentStroke.timestamp
    });

    io.to(context.room.id).emit('draw_data', {
      type: 'start',
      strokeId,
      tool,
      x,
      y,
      color: currentStroke.color,
      size: currentStroke.brushSize
    });
  });

  /**
   * Legacy draw_move adapter
   */
  socket.on('draw_move', (payload = {}) => {
    const context = validateDrawer();
    if (!context || !currentStroke) return;

    // If socket is in high-precision mode, stroke_chunk is already handling points
    if (currentStroke.isHighPrecision) {
      return;
    }

    const { x, y } = payload;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    const pt = sanitizePoint({ x, y });
    if (!pt) return;

    currentStroke.points.push(pt);

    io.to(context.room.id).emit('stroke_chunk', {
      strokeId: currentStroke.strokeId,
      playerId: context.playerId,
      tool: currentStroke.tool,
      color: currentStroke.color,
      brushSize: currentStroke.brushSize,
      points: [pt],
      sequence: currentStroke.points.length
    });

    io.to(context.room.id).emit('draw_data', {
      type: 'move',
      strokeId: currentStroke.strokeId,
      tool: currentStroke.tool,
      x,
      y
    });
  });

  /**
   * Legacy draw_end adapter
   */
  socket.on('draw_end', () => {
    const context = validateDrawer();
    if (!context) {
      currentStroke = null;
      return;
    }

    // If socket is in high-precision mode, stroke_end is already handling finalization
    if (currentStroke && currentStroke.isHighPrecision) {
      return;
    }

    if (currentStroke) {
      context.game.strokes.push(currentStroke);
      const finished = { ...currentStroke };
      currentStroke = null;

      io.to(context.room.id).emit('stroke_end', {
        strokeId: finished.strokeId,
        stroke: finished
      });
    }

    io.to(context.room.id).emit('draw_data', {
      type: 'end'
    });
  });
}
