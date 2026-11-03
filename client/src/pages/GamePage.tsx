import React from 'react';
import {
  RoomData,
  Player,
  GameStateData,
  RoundEndData,
  GameOverData,
  ChatMessage,
  DrawDataPoint,
  CompletedStroke
} from '../types';
import { GameCanvas } from '../components/GameCanvas';
import { Chat } from '../components/Chat';
import { Leaderboard } from '../components/Leaderboard';
import { GameTimer } from '../components/GameTimer';
import { WordModal } from '../components/WordModal';
import { GameOverModal } from '../components/GameOver';
import { LogOut, Sparkles } from 'lucide-react';

interface GamePageProps {
  room: RoomData;
  currentUser: Player | null;
  gameState: GameStateData | null;
  wordOptions: string[];
  roundEndData: RoundEndData | null;
  gameOverData: GameOverData | null;
  chatMessages: ChatMessage[];
  remoteDrawData: DrawDataPoint | null;
  remoteClearTrigger: number;
  remoteUndoStrokes: CompletedStroke[] | null;
  onChooseWord: (word: string) => void;
  onDrawStart: (x: number, y: number, color: string, size: number) => void;
  onDrawMove: (x: number, y: number) => void;
  onDrawEnd: () => void;
  onClearCanvas: () => void;
  onUndoDrawing: () => void;
  onSendGuess: (text: string) => void;
  onSendChat: (text: string) => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  room,
  currentUser,
  gameState,
  wordOptions,
  roundEndData,
  gameOverData,
  chatMessages,
  remoteDrawData,
  remoteClearTrigger,
  remoteUndoStrokes,
  onChooseWord,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onClearCanvas,
  onUndoDrawing,
  onSendGuess,
  onSendChat,
  onStartGame,
  onLeaveRoom
}) => {
  const currentDrawerId = gameState?.drawerId || room.currentDrawerId || null;
  const isDrawer = Boolean(currentUser && currentDrawerId && currentUser.id === currentDrawerId);
  const currentDrawerPlayer = room.players.find((p) => p.id === currentDrawerId);
  const drawerName = currentDrawerPlayer ? currentDrawerPlayer.name : 'Player';
  const isHost = Boolean(currentUser?.id === room.hostId || currentUser?.isHost);

  const phase = gameState?.phase || room.phase || 'LOBBY';
  const round = gameState?.round || room.currentRound || 1;
  const totalRounds = gameState?.totalRounds || room.totalRounds || room.settings.rounds || 3;
  const timeLeft = gameState?.timeLeft !== undefined ? gameState.timeLeft : room.settings.drawTime;
  const hints = gameState?.hints || '';
  const drawerWord = gameState?.word;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4">
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-mono font-bold text-sm text-mono-text bg-mono-white border border-mono-border px-3 py-1 rounded-lg">
            Room: {room.roomId}
          </span>
        </div>

        <button
          onClick={onLeaveRoom}
          type="button"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-mono-border bg-mono-white text-xs font-semibold text-mono-secondary hover:text-mono-text hover:border-mono-text transition-colors"
        >
          <LogOut size={13} />
          <span>Exit Game</span>
        </button>
      </div>

      {/* Top Timer & Hints Bar */}
      <GameTimer
        phase={phase}
        round={round}
        totalRounds={totalRounds}
        timeLeft={timeLeft}
        hints={hints}
        isDrawer={isDrawer}
        drawerWord={drawerWord}
      />

      {/* Round End Notification Banner */}
      {roundEndData && (
        <div className="p-4 rounded-xl border border-mono-text bg-mono-white text-mono-text shadow-md animate-in slide-in-from-top duration-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs uppercase font-mono tracking-wider font-bold">
              <Sparkles size={14} />
              <span>Round Complete</span>
            </div>
            <div className="text-base sm:text-lg font-bold">
              The word was:{' '}
              <span className="font-mono font-black uppercase underline underline-offset-4 tracking-wider">
                {roundEndData.word}
              </span>
            </div>
          </div>
          <div className="text-xs text-mono-secondary font-medium">
            Next Drawer:{' '}
            <strong className="text-mono-text">{roundEndData.nextDrawer}</strong>
          </div>
        </div>
      )}

      {/* Main 3-Column / Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Leaderboard (3 cols on lg) */}
        <div className="lg:col-span-3 order-2 lg:order-1">
          <Leaderboard
            players={room.players}
            currentDrawerId={currentDrawerId}
            currentUserId={currentUser?.id}
          />
        </div>

        {/* Center Column: Game Canvas (6 cols on lg) */}
        <div className="lg:col-span-6 order-1 lg:order-2">
          <GameCanvas
            isDrawer={isDrawer && phase === 'DRAWING'}
            drawerName={drawerName}
            remoteDrawData={remoteDrawData}
            remoteClearTrigger={remoteClearTrigger}
            remoteUndoStrokes={remoteUndoStrokes}
            onDrawStart={onDrawStart}
            onDrawMove={onDrawMove}
            onDrawEnd={onDrawEnd}
            onClear={onClearCanvas}
            onUndo={onUndoDrawing}
          />
        </div>

        {/* Right Column: Chat & Guessing (3 cols on lg) */}
        <div className="lg:col-span-3 order-3">
          <Chat
            messages={chatMessages}
            currentUser={currentUser}
            isDrawer={isDrawer}
            hasGuessed={currentUser?.hasGuessed}
            isDrawingPhase={phase === 'DRAWING'}
            onSendGuess={onSendGuess}
            onSendChat={onSendChat}
          />
        </div>
      </div>

      {/* Drawer Word Selection Modal */}
      {isDrawer && phase === 'CHOOSING_WORD' && (
        <WordModal
          words={wordOptions}
          timeLeft={timeLeft}
          onSelectWord={onChooseWord}
        />
      )}

      {/* Game Over Modal */}
      {gameOverData && (
        <GameOverModal
          data={gameOverData}
          isHost={isHost}
          onRestart={onStartGame}
          onLeave={onLeaveRoom}
        />
      )}
    </div>
  );
};
