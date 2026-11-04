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
import { LogOut, Sparkles, Hash } from 'lucide-react';

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
    <div className="w-full max-w-7xl mx-auto space-y-4 py-1">
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-white border-2 border-skribbl-border shadow-xs">
            <Hash size={15} className="text-skribbl-blue" />
            <span className="font-mono font-black text-sm text-slate-800 tracking-wider">
              {room.roomId}
            </span>
          </div>
        </div>

        <button
          onClick={onLeaveRoom}
          type="button"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-white border-2 border-rose-200 text-xs font-fun font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <LogOut size={14} />
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
        <div className="p-4 sm:p-5 rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 text-slate-800 shadow-skribbl animate-in slide-in-from-top duration-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left select-none">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-xs uppercase font-fun tracking-wider font-bold text-amber-700">
              <Sparkles size={15} />
              <span>Round Complete!</span>
            </div>
            <div className="text-base sm:text-lg font-fun font-bold text-slate-800">
              The secret word was:{' '}
              <span className="font-fun font-black uppercase text-skribbl-blue bg-white border border-sky-200 px-3 py-1 rounded-2xl tracking-wider shadow-xs ml-1">
                {roundEndData.word}
              </span>
            </div>
          </div>
          <div className="text-xs font-fun text-slate-600 bg-white/80 border border-amber-200 px-3 py-1.5 rounded-2xl">
            Next Drawer:{' '}
            <strong className="text-slate-900 font-bold">{roundEndData.nextDrawer}</strong>
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

export default GamePage;
