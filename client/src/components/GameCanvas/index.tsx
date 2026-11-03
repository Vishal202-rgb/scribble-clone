import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Eraser, RotateCcw, Trash2, Pen } from 'lucide-react';
import { DrawDataPoint, CompletedStroke } from '../../types';

interface GameCanvasProps {
  isDrawer: boolean;
  drawerName?: string;
  remoteDrawData: DrawDataPoint | null;
  remoteClearTrigger: number;
  remoteUndoStrokes: CompletedStroke[] | null;
  onDrawStart: (x: number, y: number, color: string, size: number) => void;
  onDrawMove: (x: number, y: number) => void;
  onDrawEnd: () => void;
  onClear: () => void;
  onUndo: () => void;
}

const MONO_COLORS = [
  { name: 'Black', hex: '#222222' },
  { name: 'Dark Grey', hex: '#555555' },
  { name: 'Mid Grey', hex: '#888888' },
  { name: 'Light Grey', hex: '#BBBBBB' },
  { name: 'White', hex: '#FFFFFF' }
];

const BRUSH_SIZES = [
  { label: 'S', size: 3 },
  { label: 'M', size: 7 },
  { label: 'L', size: 14 },
  { label: 'XL', size: 26 }
];

// Logical internal canvas coordinates for resolution independence
const INTERNAL_WIDTH = 800;
const INTERNAL_HEIGHT = 600;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  isDrawer,
  drawerName = 'Player',
  remoteDrawData,
  remoteClearTrigger,
  remoteUndoStrokes,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onClear,
  onUndo
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentColor, setCurrentColor] = useState<string>('#222222');
  const [currentSize, setCurrentSize] = useState<number>(7);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const [isDrawingLocal, setIsDrawingLocal] = useState<boolean>(false);

  // Clear local canvas helper
  const clearLocalCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
  }, []);

  // Re-draw all strokes helper (used for undo)
  const redrawStrokes = useCallback((strokes: CompletedStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);

    for (const stroke of strokes) {
      if (!stroke.points || stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const first = stroke.points[0];
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Initialize canvas background
  useEffect(() => {
    clearLocalCanvas();
  }, [clearLocalCanvas]);

  // Handle remote clear
  useEffect(() => {
    if (remoteClearTrigger > 0) {
      clearLocalCanvas();
    }
  }, [remoteClearTrigger, clearLocalCanvas]);

  // Handle remote undo
  useEffect(() => {
    if (remoteUndoStrokes) {
      redrawStrokes(remoteUndoStrokes);
    }
  }, [remoteUndoStrokes, redrawStrokes]);

  // Handle remote incoming draw points
  useEffect(() => {
    if (!remoteDrawData) return;
    // Authorized drawer draws locally in real time; skip remote echo to prevent jitter/duplicate strokes
    if (isDrawer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (remoteDrawData.type === 'start' && remoteDrawData.x !== undefined && remoteDrawData.y !== undefined) {
      ctx.beginPath();
      ctx.strokeStyle = remoteDrawData.color || '#222222';
      ctx.lineWidth = remoteDrawData.size || 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(remoteDrawData.x, remoteDrawData.y);
      // Small dot for single click
      ctx.lineTo(remoteDrawData.x + 0.1, remoteDrawData.y + 0.1);
      ctx.stroke();
    } else if (remoteDrawData.type === 'move' && remoteDrawData.x !== undefined && remoteDrawData.y !== undefined) {
      ctx.lineTo(remoteDrawData.x, remoteDrawData.y);
      ctx.stroke();
    } else if (remoteDrawData.type === 'end') {
      ctx.closePath();
    }
  }, [remoteDrawData, isDrawer]);

  // Convert mouse/touch coordinates to internal 800x600 coordinates
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = INTERNAL_WIDTH / rect.width;
    const scaleY = INTERNAL_HEIGHT / rect.height;

    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);

    return {
      x: Math.min(Math.max(x, 0), INTERNAL_WIDTH),
      y: Math.min(Math.max(y, 0), INTERNAL_HEIGHT)
    };
  };

  const handlePointerDown = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawer) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawingLocal(true);
    const activeColor = isEraser ? '#FFFFFF' : currentColor;
    const activeSize = isEraser ? currentSize * 2 : currentSize;

    // Direct immediate local rendering on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = activeSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x + 0.1, coords.y + 0.1);
        ctx.stroke();
      }
    }

    onDrawStart(coords.x, coords.y, activeColor, activeSize);
  };

  const handlePointerMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawer || !isDrawingLocal) return;
    const coords = getCoordinates(e);
    if (!coords) return;

    // Direct immediate local line drawing on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
    }

    onDrawMove(coords.x, coords.y);
  };

  const handlePointerUp = () => {
    if (!isDrawer || !isDrawingLocal) return;
    setIsDrawingLocal(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.closePath();
      }
    }
    onDrawEnd();
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
          {INTERNAL_WIDTH} &times; {INTERNAL_HEIGHT} px
        </span>
      </div>

      {/* Canvas Area */}
      <div className="relative w-full aspect-[4/3] bg-mono-white flex items-center justify-center p-2">
        <canvas
          ref={canvasRef}
          width={INTERNAL_WIDTH}
          height={INTERNAL_HEIGHT}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className={`w-full h-full bg-mono-white rounded border border-mono-border touch-none ${
            isDrawer ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />

        {!isDrawer && (
          <div className="absolute top-4 left-4 pointer-events-none px-2.5 py-1 rounded-md bg-mono-white/90 border border-mono-border text-[11px] font-medium text-mono-secondary backdrop-blur-sm shadow-xs">
            Drawing locked &mdash; Guesser mode
          </div>
        )}
      </div>

      {/* Drawer Controls Toolbar (Monochromatic) */}
      {isDrawer && (
        <div className="p-3 border-t border-mono-border bg-mono-light flex flex-wrap items-center justify-between gap-3">
          {/* Colors */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mono-secondary hidden sm:inline">
              Color:
            </span>
            <div className="flex items-center space-x-1.5">
              {MONO_COLORS.map((color) => {
                const isSelected = !isEraser && currentColor === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    title={color.name}
                    onClick={() => {
                      setIsEraser(false);
                      setCurrentColor(color.hex);
                    }}
                    className={`w-7 h-7 rounded-md border transition-all ${
                      isSelected
                        ? 'ring-2 ring-mono-text ring-offset-1 scale-105'
                        : 'border-mono-border hover:border-mono-secondary'
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                );
              })}
            </div>
          </div>

          {/* Sizes */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-mono-secondary hidden sm:inline">
              Size:
            </span>
            <div className="flex items-center space-x-1 bg-mono-white border border-mono-border rounded-lg p-0.5">
              {BRUSH_SIZES.map((brush) => (
                <button
                  key={brush.label}
                  type="button"
                  onClick={() => setCurrentSize(brush.size)}
                  className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${
                    currentSize === brush.size
                      ? 'bg-mono-text text-mono-white'
                      : 'text-mono-secondary hover:text-mono-text'
                  }`}
                >
                  {brush.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              title="Pen Tool"
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                !isEraser
                  ? 'bg-mono-text text-mono-white border-mono-text'
                  : 'bg-mono-white text-mono-secondary border-mono-border hover:text-mono-text'
              }`}
            >
              <Pen size={14} />
            </button>

            <button
              type="button"
              title="Eraser Tool"
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all ${
                isEraser
                  ? 'bg-mono-text text-mono-white border-mono-text'
                  : 'bg-mono-white text-mono-secondary border-mono-border hover:text-mono-text'
              }`}
            >
              <Eraser size={14} />
            </button>

            <button
              type="button"
              title="Undo Stroke"
              onClick={onUndo}
              className="p-2 rounded-lg border border-mono-border bg-mono-white text-mono-secondary hover:text-mono-text hover:border-mono-text transition-all"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              title="Clear Canvas"
              onClick={() => {
                clearLocalCanvas();
                onClear();
              }}
              className="p-2 rounded-lg border border-mono-border bg-mono-white text-mono-secondary hover:text-mono-text hover:border-mono-text transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
