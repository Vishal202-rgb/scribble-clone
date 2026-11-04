export interface Player {
  id: string;
  socketId: string;
  name: string;
  isHost: boolean;
  score: number;
  roundScore?: number;
  hasGuessed?: boolean;
  isDrawing?: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  isPrivate: boolean;
}

export type GamePhase = 'LOBBY' | 'CHOOSING_WORD' | 'DRAWING' | 'ROUND_END' | 'GAME_OVER';

export interface RoomData {
  roomId: string;
  hostId: string;
  settings: RoomSettings;
  players: Player[];
  gameState: 'LOBBY' | 'IN_GAME';
  playerCount: number;
  currentRound?: number;
  totalRounds?: number;
  currentDrawerId?: string | null;
  phase?: GamePhase;
}

export interface GameStateData {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName?: string;
  word?: string;
  hints: string;
  timeLeft: number;
}

export interface RoundStartData {
  drawerId: string;
  drawerName: string;
  wordOptions?: string[];
  drawTime: number;
  round: number;
  totalRounds: number;
  players?: Player[];
}

export interface RoundEndData {
  word: string;
  scores: Player[];
  nextDrawer: string;
  reason: 'time_up' | 'all_guessed' | 'drawer_left';
}

export interface GameOverData {
  winner: Player | null;
  leaderboard: Player[];
}

export type DrawingTool = 'brush' | 'circle' | 'ellipse' | 'rectangle' | 'square' | 'line' | 'eraser';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  strokeId: string;
  playerId: string;
  tool: DrawingTool;
  color: string;
  brushSize: number;
  points: NormalizedPoint[];
  timestamp: number;
  sequence: number;
}

export interface StrokeChunkData {
  strokeId: string;
  playerId: string;
  tool: DrawingTool;
  color: string;
  brushSize: number;
  points: NormalizedPoint[];
  sequence: number;
}

export interface DrawDataPoint {
  type: 'start' | 'move' | 'end';
  x?: number;
  y?: number;
  color?: string;
  size?: number;
  tool?: DrawingTool;
  strokeId?: string;
  points?: NormalizedPoint[];
}

export interface CompletedStroke {
  strokeId?: string;
  playerId?: string;
  type?: 'stroke';
  tool?: DrawingTool;
  color: string;
  size: number;
  brushSize?: number;
  points: NormalizedPoint[];
  timestamp?: number;
  sequence?: number;
}

export interface ChatMessage {
  id: string;
  playerId?: string;
  playerName?: string;
  text: string;
  system?: boolean;
  alreadyGuessed?: boolean;
  timestamp: number;
}

export type ViewState = 'HOME' | 'CREATE' | 'JOIN' | 'LOBBY';
