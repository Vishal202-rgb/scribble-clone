import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, RotateCcw, Trash2, Pen, Minus, Square, RectangleHorizontal, Circle } from 'lucide-react';
import { socket } from '../../services/socket';
import {
  DrawDataPoint,
  CompletedStroke,
  DrawingTool,
  DrawingStroke,
  NormalizedPoint,
  StrokeChunkData
} from '../../types';

interface GameCanvasProps {
  isDrawer: boolean;
  drawerName?: string;
  remoteDrawData?: DrawDataPoint | null;
  remoteClearTrigger?: number;
  remoteUndoStrokes?: CompletedStroke[] | null;
  onDrawStart?: (x: number, y: number, color: string, size: number) => void;
  onDrawMove?: (x: number, y: number) => void;
  onDrawEnd?: () => void;
  onClear?: () => void;
  onUndo?: () => void;
}

// 14 Vibrant, Distinct Colors
export const PALETTE_COLORS = [
  { name: 'Black', hex: '#222222' },
  { name: 'Dark Grey', hex: '#616161' },
  { name: 'Light Grey', hex: '#BDBDBD' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#E53935' },
  { name: 'Orange', hex: '#FB8C00' },
  { name: 'Yellow', hex: '#FDD835' },
  { name: 'Green', hex: '#43A047' },
  { name: 'Light Green', hex: '#7CB342' },
  { name: 'Blue', hex: '#1E88E5' },
  { name: 'Light Blue', hex: '#00ACC1' },
  { name: 'Purple', hex: '#8E24AA' },
  { name: 'Pink', hex: '#D81B60' },
  { name: 'Brown', hex: '#6D4C41' }
];

export const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 7 },
  { label: 'L', size: 14 },
  { label: 'XL', size: 26 }
];

// Fixed logical internal canvas space (all coordinates normalized to 0..1 relative to this)
const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 750;

/**
 * Shared rendering helper: draws any stroke on a 2D canvas context identically
 */
function renderStrokeToContext(ctx: CanvasRenderingContext2D, stroke: DrawingStroke | CompletedStroke) {
  if (!stroke.points || stroke.points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const brushSize =
    'brushSize' in stroke && typeof stroke.brushSize === 'number'
      ? stroke.brushSize
      : 'size' in stroke && typeof (stroke as { size?: number }).size === 'number'
        ? (stroke as { size: number }).size
        : 4;
  ctx.lineWidth = brushSize;
  const isEraser = stroke.tool === 'eraser';
  ctx.strokeStyle = isEraser ? '#FFFFFF' : stroke.color;

  const p0 = stroke.points[0];
  const x0 = p0.x * LOGICAL_WIDTH;
  const y0 = p0.y * LOGICAL_HEIGHT;

  if (!stroke.tool || stroke.tool === 'brush' || stroke.tool === 'eraser') {
    if (stroke.points.length === 1) {
      ctx.fillStyle = isEraser ? '#FFFFFF' : stroke.color;
      ctx.beginPath();
      ctx.arc(x0, y0, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i < stroke.points.length; i++) {
        const pt = stroke.points[i];
        ctx.lineTo(pt.x * LOGICAL_WIDTH, pt.y * LOGICAL_HEIGHT);
      }
      ctx.stroke();
    }
  } else if (stroke.tool === 'line') {
    const pEnd = stroke.points[stroke.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(pEnd.x * LOGICAL_WIDTH, pEnd.y * LOGICAL_HEIGHT);
    ctx.stroke();
  } else if (stroke.tool === 'rectangle') {
    const pEnd = stroke.points[stroke.points.length - 1];
    const x1 = pEnd.x * LOGICAL_WIDTH;
    const y1 = pEnd.y * LOGICAL_HEIGHT;
    ctx.beginPath();
    ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
  } else if (stroke.tool === 'square') {
    const pEnd = stroke.points[stroke.points.length - 1];
    const x1 = pEnd.x * LOGICAL_WIDTH;
    const y1 = pEnd.y * LOGICAL_HEIGHT;
    const side = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    const signX = x1 >= x0 ? 1 : -1;
    const signY = y1 >= y0 ? 1 : -1;
    const rx = signX === 1 ? x0 : x0 - side;
    const ry = signY === 1 ? y0 : y0 - side;
    ctx.beginPath();
    ctx.strokeRect(rx, ry, side, side);
  } else if (stroke.tool === 'circle' || stroke.tool === 'ellipse') {
    const pEnd = stroke.points[stroke.points.length - 1];
    const x1 = pEnd.x * LOGICAL_WIDTH;
    const y1 = pEnd.y * LOGICAL_HEIGHT;
    const centerX = (x0 + x1) / 2;
    const centerY = (y0 + y1) / 2;
    const radiusX = Math.abs(x1 - x0) / 2;
    const radiusY = Math.abs(y1 - y0) / 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, Math.max(radiusX, 0.1), Math.max(radiusY, 0.1), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  isDrawer,
  drawerName = 'Player',
  remoteDrawData: _remoteDrawData,
  remoteClearTrigger = 0,
  remoteUndoStrokes,
  onDrawStart: _onDrawStart,
  onDrawMove: _onDrawMove,
  onDrawEnd: _onDrawEnd,
  onClear,
  onUndo
}) => {
  // Layered dual-canvas references
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tool, Palette, and Brush Settings
  const [activeTool, setActiveTool] = useState<DrawingTool>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#222222');
  const [currentSize, setCurrentSize] = useState<number>(7);

  // In-memory stroke history for clean redraws and recovery
  const strokesHistoryRef = useRef<DrawingStroke[]>([]);

  // Active drawer stroke tracking
  const activeStrokeRef = useRef<{
    strokeId: string;
    tool: DrawingTool;
    color: string;
    brushSize: number;
    points: NormalizedPoint[];
    sequence: number;
  } | null>(null);

  // Buffered points for high-frequency streaming
  const pendingPointsBufferRef = useRef<NormalizedPoint[]>([]);
  const streamFlushTimerRef = useRef<number | null>(null);

  // Remote active stroke tracking for guessers
  const remoteActiveStrokeRef = useRef<{
    strokeId: string;
    tool: DrawingTool;
    color: string;
    brushSize: number;
    points: NormalizedPoint[];
  } | null>(null);

  /**
   * Setup canvas backing store resolution with devicePixelRatio scaling
   */
  const setupCanvasResolution = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;

    [mainCanvasRef.current, previewCanvasRef.current].forEach((canvas) => {
      if (!canvas) return;
      canvas.width = Math.round(LOGICAL_WIDTH * dpr);
      canvas.height = Math.round(LOGICAL_HEIGHT * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    });
  }, []);

  /**
   * Clear main canvas to pure white #FFFFFF
   */
  const clearMainCanvas = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.restore();
  }, []);

  /**
   * Clear preview canvas overlay
   */
  const clearPreviewCanvas = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }, []);

  /**
   * Re-draw all strokes from history
   */
  const redrawAllStrokes = useCallback((strokes: (DrawingStroke | CompletedStroke)[]) => {
    clearMainCanvas();
    clearPreviewCanvas();
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    for (const stroke of strokes) {
      renderStrokeToContext(ctx, stroke as DrawingStroke);
    }
  }, [clearMainCanvas, clearPreviewCanvas]);

  // Initialize canvas on mount and window resize
  useEffect(() => {
    setupCanvasResolution();
    clearMainCanvas();

    const handleResize = () => {
      setupCanvasResolution();
      redrawAllStrokes(strokesHistoryRef.current);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvasResolution, clearMainCanvas, redrawAllStrokes]);

  // Request canvas state upon mount or drawer change for late joiners/reconnection
  useEffect(() => {
    socket.emit('get_canvas_state');
  }, [isDrawer]);

  // Handle remote canvas clear trigger
  useEffect(() => {
    if (remoteClearTrigger > 0) {
      strokesHistoryRef.current = [];
      clearMainCanvas();
      clearPreviewCanvas();
    }
  }, [remoteClearTrigger, clearMainCanvas, clearPreviewCanvas]);

  // Handle remote undo strokes update
  useEffect(() => {
    if (remoteUndoStrokes) {
      strokesHistoryRef.current = remoteUndoStrokes as DrawingStroke[];
      redrawAllStrokes(remoteUndoStrokes);
    }
  }, [remoteUndoStrokes, redrawAllStrokes]);

  /**
   * Direct Socket.IO Drawing Listeners (bypasses React state updates to prevent 60fps drops!)
   */
  useEffect(() => {
    function onRemoteStrokeStart(data: {
      strokeId: string;
      playerId: string;
      tool: DrawingTool;
      color: string;
      brushSize: number;
      point: NormalizedPoint;
    }) {
      if (isDrawer) return; // Drawer renders locally in real time
      remoteActiveStrokeRef.current = {
        strokeId: data.strokeId,
        tool: data.tool,
        color: data.color,
        brushSize: data.brushSize,
        points: [data.point]
      };

      if (data.tool === 'brush' || data.tool === 'eraser') {
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderStrokeToContext(ctx, {
          strokeId: data.strokeId,
          playerId: data.playerId,
          tool: data.tool,
          color: data.color,
          brushSize: data.brushSize,
          points: [data.point],
          timestamp: Date.now(),
          sequence: 0
        });
      }
    }

    function onRemoteStrokeChunk(data: StrokeChunkData) {
      if (isDrawer) return; // Drawer renders locally in real time
      let active = remoteActiveStrokeRef.current;
      if (!active || active.strokeId !== data.strokeId) {
        active = {
          strokeId: data.strokeId,
          tool: data.tool || 'brush',
          color: data.color || '#222222',
          brushSize: typeof data.brushSize === 'number' ? data.brushSize : 4,
          points: []
        };
        remoteActiveStrokeRef.current = active;
      }

      if (data.tool) active.tool = data.tool;
      if (data.color) active.color = data.color;
      if (typeof data.brushSize === 'number') active.brushSize = data.brushSize;

      active.points.push(...data.points);

      if (active.tool === 'brush' || active.tool === 'eraser') {
        // Draw progressive segment directly on main canvas
        const canvas = mainCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = active.brushSize;
        ctx.strokeStyle = active.tool === 'eraser' ? '#FFFFFF' : active.color;
        ctx.beginPath();
        const startIdx = Math.max(0, active.points.length - data.points.length - 1);
        ctx.moveTo(active.points[startIdx].x * LOGICAL_WIDTH, active.points[startIdx].y * LOGICAL_HEIGHT);
        for (let i = startIdx + 1; i < active.points.length; i++) {
          ctx.lineTo(active.points[i].x * LOGICAL_WIDTH, active.points[i].y * LOGICAL_HEIGHT);
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Shape preview (Line, Rect, Square, Circle): clear previewCanvas and draw live preview
        clearPreviewCanvas();
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const p0 = active.points[0];
        const pEnd = active.points[active.points.length - 1];
        renderStrokeToContext(ctx, {
          strokeId: active.strokeId,
          playerId: data.playerId,
          tool: active.tool,
          color: active.color,
          brushSize: active.brushSize,
          points: [p0, pEnd],
          timestamp: Date.now(),
          sequence: data.sequence
        });
      }
    }

    function onRemoteStrokeEnd(data: { strokeId: string; stroke?: DrawingStroke }) {
      if (isDrawer) return; // Drawer committed locally
      clearPreviewCanvas();
      const finalStroke = data.stroke || (remoteActiveStrokeRef.current as DrawingStroke);
      if (finalStroke) {
        strokesHistoryRef.current.push(finalStroke);
        const canvas = mainCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            renderStrokeToContext(ctx, finalStroke);
          }
        }
      }
      remoteActiveStrokeRef.current = null;
    }

    function onRemoteCanvasClear() {
      strokesHistoryRef.current = [];
      clearMainCanvas();
      clearPreviewCanvas();
    }

    function onRemoteDrawUndo(data: { strokes: DrawingStroke[] }) {
      strokesHistoryRef.current = data.strokes || [];
      redrawAllStrokes(strokesHistoryRef.current);
    }

    function onRemoteCanvasState(data: { strokes: DrawingStroke[] }) {
      if (Array.isArray(data.strokes)) {
        strokesHistoryRef.current = data.strokes;
        redrawAllStrokes(data.strokes);
      }
    }

    socket.on('stroke_start', onRemoteStrokeStart);
    socket.on('stroke_chunk', onRemoteStrokeChunk);
    socket.on('stroke_end', onRemoteStrokeEnd);
    socket.on('canvas_clear', onRemoteCanvasClear);
    socket.on('draw_undo', onRemoteDrawUndo);
    socket.on('canvas_state', onRemoteCanvasState);

    return () => {
      socket.off('stroke_start', onRemoteStrokeStart);
      socket.off('stroke_chunk', onRemoteStrokeChunk);
      socket.off('stroke_end', onRemoteStrokeEnd);
      socket.off('canvas_clear', onRemoteCanvasClear);
      socket.off('draw_undo', onRemoteDrawUndo);
      socket.off('canvas_state', onRemoteCanvasState);
    };
  }, [isDrawer, clearMainCanvas, clearPreviewCanvas, redrawAllStrokes]);

  /**
   * Normalized coordinate calculator [0, 1] relative to logical canvas
   */
  const getNormalizedCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): NormalizedPoint | null => {
    const canvas = previewCanvasRef.current || mainCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const rawX = (e.clientX - rect.left) / rect.width;
    const rawY = (e.clientY - rect.top) / rect.height;

    const clampedX = Math.min(Math.max(rawX, 0), 1);
    const clampedY = Math.min(Math.max(rawY, 0), 1);

    return {
      x: Math.round(clampedX * 10000) / 10000,
      y: Math.round(clampedY * 10000) / 10000
    };
  };

  /**
   * Flush buffered points over Socket.IO in chunks (16ms throttle for smooth high-density points)
   */
  /**
   * Flush buffered points over Socket.IO in chunks (16ms throttle for smooth high-density points)
   */
  const flushBufferedPoints = useCallback(() => {
    if (!activeStrokeRef.current || pendingPointsBufferRef.current.length === 0) return;

    const chunk = [...pendingPointsBufferRef.current];
    pendingPointsBufferRef.current = [];

    socket.emit('stroke_chunk', {
      strokeId: activeStrokeRef.current.strokeId,
      tool: activeStrokeRef.current.tool,
      color: activeStrokeRef.current.color,
      brushSize: activeStrokeRef.current.brushSize,
      points: chunk,
      sequence: activeStrokeRef.current.points.length
    });
  }, []);

  /**
   * Pointer Down - Start Stroke with Pointer Capture
   */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const norm = getNormalizedCoordinates(e);
    if (!norm) return;

    // Capture pointer so moving outside the canvas boundaries keeps drawing
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}

    const strokeId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const effectiveColor = activeTool === 'eraser' ? '#FFFFFF' : currentColor;
    const effectiveSize = activeTool === 'eraser' ? currentSize * 2 : currentSize;

    activeStrokeRef.current = {
      strokeId,
      tool: activeTool,
      color: effectiveColor,
      brushSize: effectiveSize,
      points: [norm],
      sequence: 0
    };

    pendingPointsBufferRef.current = [norm];

    // Emit stroke_start with explicit tool type
    socket.emit('stroke_start', {
      strokeId,
      tool: activeTool,
      color: effectiveColor,
      brushSize: effectiveSize,
      point: norm,
      sequence: 0,
      timestamp: Date.now()
    });

    // Direct local render on start for brush/eraser
    if (activeTool === 'brush' || activeTool === 'eraser') {
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStrokeToContext(ctx, {
            strokeId,
            playerId: 'self',
            tool: activeTool,
            color: effectiveColor,
            brushSize: effectiveSize,
            points: [norm],
            timestamp: Date.now(),
            sequence: 0
          });
        }
      }
    }
  };

  /**
   * Pointer Move - Incremental Drawing & Live Shape Preview
   */
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !activeStrokeRef.current) return;
    const norm = getNormalizedCoordinates(e);
    if (!norm) return;

    const stroke = activeStrokeRef.current;
    const prevPoint = stroke.points[stroke.points.length - 1];

    // Deduplicate identical points
    if (prevPoint && Math.abs(prevPoint.x - norm.x) < 0.0001 && Math.abs(prevPoint.y - norm.y) < 0.0001) {
      return;
    }

    stroke.points.push(norm);
    pendingPointsBufferRef.current.push(norm);

    if (stroke.tool === 'brush' || stroke.tool === 'eraser') {
      // Immediate local render of line segment on main canvas
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = stroke.brushSize;
          ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
          ctx.beginPath();
          ctx.moveTo(prevPoint.x * LOGICAL_WIDTH, prevPoint.y * LOGICAL_HEIGHT);
          ctx.lineTo(norm.x * LOGICAL_WIDTH, norm.y * LOGICAL_HEIGHT);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else {
      // Shape Preview (Line, Rectangle, Square, Circle, Ellipse) on transparent preview overlay canvas
      clearPreviewCanvas();
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          let pEnd = norm;
          if (stroke.tool === 'square') {
            const side = Math.max(Math.abs(norm.x - stroke.points[0].x), Math.abs(norm.y - stroke.points[0].y));
            const signX = norm.x >= stroke.points[0].x ? 1 : -1;
            const signY = norm.y >= stroke.points[0].y ? 1 : -1;
            pEnd = {
              x: Math.round((stroke.points[0].x + signX * side) * 10000) / 10000,
              y: Math.round((stroke.points[0].y + signY * side) * 10000) / 10000
            };
          }
          renderStrokeToContext(ctx, {
            strokeId: stroke.strokeId,
            playerId: 'self',
            tool: stroke.tool,
            color: stroke.color,
            brushSize: stroke.brushSize,
            points: [stroke.points[0], pEnd],
            timestamp: Date.now(),
            sequence: stroke.points.length
          });
        }
      }
    }

    // Schedule socket chunk flush via requestAnimationFrame (no dropped events, zero lag)
    if (!streamFlushTimerRef.current) {
      streamFlushTimerRef.current = window.requestAnimationFrame(() => {
        streamFlushTimerRef.current = null;
        flushBufferedPoints();
      });
    }
  };

  /**
   * Pointer Up / Cancel - Commit Stroke to Main Canvas & Emit stroke_end
   */
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer || !activeStrokeRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}

    if (streamFlushTimerRef.current) {
      window.cancelAnimationFrame(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    // Flush any remaining buffered points
    flushBufferedPoints();

    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;

    clearPreviewCanvas();

    const isShape =
      stroke.tool === 'line' ||
      stroke.tool === 'rectangle' ||
      stroke.tool === 'square' ||
      stroke.tool === 'circle' ||
      stroke.tool === 'ellipse';

    if (isShape) {
      const p0 = stroke.points[0];
      let pEnd = stroke.points[stroke.points.length - 1];
      if (stroke.tool === 'square') {
        const side = Math.max(Math.abs(pEnd.x - p0.x), Math.abs(pEnd.y - p0.y));
        const signX = pEnd.x >= p0.x ? 1 : -1;
        const signY = pEnd.y >= p0.y ? 1 : -1;
        pEnd = {
          x: Math.round((p0.x + signX * side) * 10000) / 10000,
          y: Math.round((p0.y + signY * side) * 10000) / 10000
        };
      }

      const shapeStroke: DrawingStroke = {
        strokeId: stroke.strokeId,
        playerId: 'self',
        tool: stroke.tool,
        color: stroke.color,
        brushSize: stroke.brushSize,
        points: [p0, pEnd],
        timestamp: Date.now(),
        sequence: stroke.points.length
      };

      const canvas = mainCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStrokeToContext(ctx, shapeStroke);
        }
      }

      strokesHistoryRef.current.push(shapeStroke);

      socket.emit('stroke_end', {
        strokeId: stroke.strokeId,
        finalStroke: shapeStroke
      });
    } else {
      const fullStroke: DrawingStroke = {
        strokeId: stroke.strokeId,
        playerId: 'self',
        tool: stroke.tool,
        color: stroke.color,
        brushSize: stroke.brushSize,
        points: stroke.points,
        timestamp: Date.now(),
        sequence: stroke.points.length
      };

      strokesHistoryRef.current.push(fullStroke);

      socket.emit('stroke_end', {
        strokeId: stroke.strokeId,
        finalStroke: fullStroke
      });
    }
  };

  /**
   * Handle Undo Action
   */
  const handleUndo = () => {
    if (!isDrawer) return;
    if (strokesHistoryRef.current.length > 0) {
      strokesHistoryRef.current.pop();
      redrawAllStrokes(strokesHistoryRef.current);
    }
    socket.emit('draw_undo');
    if (onUndo) onUndo();
  };

  /**
   * Handle Clear Action
   */
  const handleClear = () => {
    if (!isDrawer) return;
    strokesHistoryRef.current = [];
    clearMainCanvas();
    clearPreviewCanvas();
    socket.emit('canvas_clear');
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col bg-mono-white border border-mono-border rounded-xl shadow-sm overflow-hidden select-none">
      {/* Canvas Header / Status Bar */}
      <div className="px-4 py-2 border-b border-mono-border flex items-center justify-between text-xs bg-mono-light">
        <div className="flex items-center space-x-2">
          {isDrawer ? (
            <span className="font-bold text-mono-text uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-mono-text animate-pulse" />
              <span>You are drawing</span>
            </span>
          ) : (
            <span className="text-mono-secondary flex items-center space-x-1.5">
              <span>Watching</span>
              <strong className="text-mono-text font-semibold">{drawerName}</strong>
              <span>draw</span>
            </span>
          )}
        </div>

        <span className="text-[11px] font-mono text-mono-secondary">
          {LOGICAL_WIDTH} &times; {LOGICAL_HEIGHT} px (Normalized)
        </span>
      </div>

      {/* Canvas Area with Stacked Dual Canvases (Main + Live Preview) */}
      <div className="relative w-full aspect-[4/3] bg-mono-white flex items-center justify-center p-2">
        <div className="relative w-full h-full rounded border border-mono-border overflow-hidden bg-mono-white">
          {/* Main Permanent Canvas */}
          <canvas
            ref={mainCanvasRef}
            className="absolute inset-0 w-full h-full block bg-mono-white"
          />

          {/* Interactive Preview Overlay Canvas */}
          <canvas
            ref={previewCanvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute inset-0 w-full h-full block touch-none ${
              isDrawer ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />
        </div>

        {!isDrawer && (
          <div className="absolute top-4 left-4 pointer-events-none px-2.5 py-1 rounded-md bg-mono-white/90 border border-mono-border text-[11px] font-medium text-mono-secondary backdrop-blur-sm shadow-xs">
            Drawing locked &mdash; Guesser mode
          </div>
        )}
      </div>

      {/* Drawer Controls Toolbar */}
      {isDrawer && (
        <div className="p-3 border-t border-mono-border bg-mono-light flex flex-col gap-3">
          {/* Top Row: Tools, Sizes & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Tool Selectors */}
            <div className="flex items-center space-x-1 bg-mono-white border border-mono-border rounded-lg p-0.5">
              <button
                type="button"
                title="Freehand Brush"
                onClick={() => setActiveTool('brush')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'brush'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <Pen size={14} />
                <span className="text-[10px] hidden sm:inline">Brush</span>
              </button>

              <button
                type="button"
                title="Straight Line"
                onClick={() => setActiveTool('line')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'line'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <Minus size={14} />
                <span className="text-[10px] hidden sm:inline">Line</span>
              </button>

              <button
                type="button"
                title="Rectangle"
                onClick={() => setActiveTool('rectangle')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'rectangle'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <RectangleHorizontal size={14} />
                <span className="text-[10px] hidden sm:inline">Rect</span>
              </button>

              <button
                type="button"
                title="Square"
                onClick={() => setActiveTool('square')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'square'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <Square size={14} />
                <span className="text-[10px] hidden sm:inline">Square</span>
              </button>

              <button
                type="button"
                title="Circle / Ellipse"
                onClick={() => setActiveTool('circle')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'circle'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <Circle size={14} />
                <span className="text-[10px] hidden sm:inline">Circle</span>
              </button>

              <button
                type="button"
                title="Eraser"
                onClick={() => setActiveTool('eraser')}
                className={`p-1.5 rounded text-xs font-semibold flex items-center space-x-1 transition-all ${
                  activeTool === 'eraser'
                    ? 'bg-mono-text text-mono-white'
                    : 'text-mono-secondary hover:text-mono-text'
                }`}
              >
                <Eraser size={14} />
                <span className="text-[10px] hidden sm:inline">Eraser</span>
              </button>
            </div>

            {/* Brush Sizes */}
            <div className="flex items-center space-x-1 bg-mono-white border border-mono-border rounded-lg p-0.5">
              {BRUSH_SIZES.map((brush) => (
                <button
                  key={brush.label}
                  type="button"
                  title={`Size ${brush.label} (${brush.size}px)`}
                  onClick={() => setCurrentSize(brush.size)}
                  className={`px-2 py-1 text-xs font-bold rounded transition-all ${
                    currentSize === brush.size
                      ? 'bg-mono-text text-mono-white'
                      : 'text-mono-secondary hover:text-mono-text'
                  }`}
                >
                  {brush.label}
                </button>
              ))}
            </div>

            {/* Undo & Clear Action Buttons */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                title="Undo Stroke"
                onClick={handleUndo}
                className="p-1.5 rounded-lg border border-mono-border bg-mono-white text-mono-secondary hover:text-mono-text hover:border-mono-text transition-all flex items-center space-x-1"
              >
                <RotateCcw size={14} />
                <span className="text-[10px] font-bold hidden sm:inline">Undo</span>
              </button>

              <button
                type="button"
                title="Clear Entire Canvas"
                onClick={handleClear}
                className="p-1.5 rounded-lg border border-mono-border bg-mono-white text-mono-secondary hover:text-mono-text hover:border-mono-text transition-all flex items-center space-x-1"
              >
                <Trash2 size={14} />
                <span className="text-[10px] font-bold hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Complete 14-Color Palette */}
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mono-secondary hidden md:inline">
              Color:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {PALETTE_COLORS.map((color) => {
                const isSelected = activeTool !== 'eraser' && currentColor === color.hex;
                return (
                  <button
                    key={color.name}
                    type="button"
                    title={color.name}
                    onClick={() => {
                      if (activeTool === 'eraser') {
                        setActiveTool('brush');
                      }
                      setCurrentColor(color.hex);
                    }}
                    className={`w-6 h-6 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-mono-text ring-offset-1 scale-110 shadow-xs'
                        : 'border-mono-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
