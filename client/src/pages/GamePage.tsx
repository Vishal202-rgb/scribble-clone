import React, { useState } from 'react';
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
import { useMobileOrientation } from '../hooks/useMobileOrientation';
import { LogOut, Sparkles, Hash, RotateCw, Smartphone, Trophy, X, Clock, Eye } from 'lucide-react';

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

  const {
    isLandscape,
    isSimulatedLandscape,
    toggleLandscape,
    exitLandscape
  } = useMobileOrientation();

  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);

  if (isLandscape) {
    return (
      <div
        className={`w-full h-[100dvh] flex flex-col justify-between overflow-hidden p-1.5 sm:p-2 bg-[#EEF5FC] select-none ${
          isSimulatedLandscape ? 'simulated-landscape' : ''
        }`}
      >
        {/* Compact Landscape Header */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/95 border-2 border-skribbl-border rounded-2xl shadow-xs shrink-0 gap-2">
          {/* Left: Room & Round Info */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded-xl border border-slate-200">
              #{room.roomId}
            </span>
            <span className="font-fun font-bold text-xs text-skribbl-blue bg-sky-50 px-2 py-0.5 rounded-xl border border-sky-200">
              R {round}/{totalRounds}
            </span>
          </div>

          {/* Center: Word Hints / Secret Word & Timer */}
          <div className="flex items-center space-x-2 truncate">
            {phase === 'DRAWING' ? (
              isDrawer ? (
                <div className="flex items-center space-x-1.5 text-xs font-fun font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-xl border border-emerald-300">
                  <Eye size={13} />
                  <span className="tracking-wider uppercase">{drawerWord}</span>
                  <span className="text-[10px] text-emerald-600">({drawerWord?.length}L)</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono text-base font-black tracking-widest text-slate-800">
                    {hints}
                  </span>
                  <span className="text-[10px] font-fun text-slate-400">
                    ({hints.replace(/\s+/g, '').length}L)
                  </span>
                </div>
              )
            ) : phase === 'CHOOSING_WORD' ? (
              <span className="text-xs font-fun font-bold text-amber-600 animate-pulse">
                Choosing word...
              </span>
            ) : (
              <span className="text-xs font-fun text-slate-500">
                {phase === 'ROUND_END' ? 'Round Finished' : 'Waiting...'}
              </span>
            )}

            {/* Compact Countdown Clock */}
            <div
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-xl font-mono font-black text-xs border transition-all ${
                timeLeft <= 10 && phase === 'DRAWING'
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-sky-50 text-slate-700 border-skribbl-blueBorder'
              }`}
            >
              <Clock size={12} className={timeLeft <= 10 && phase === 'DRAWING' ? 'animate-spin' : ''} />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* Right Controls: Leaderboard Drawer, Portrait Toggle & Exit */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowLeaderboardModal(true)}
              className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-fun font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Show Player Scores"
            >
              <Trophy size={13} className="text-amber-500" />
              <span>Scores</span>
            </button>

            <button
              type="button"
              onClick={exitLandscape}
              className="px-2.5 py-1 rounded-xl bg-skribbl-blue hover:bg-skribbl-blueDark text-white text-xs font-fun font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Return to Portrait Layout"
            >
              <Smartphone size={13} />
              <span>Portrait</span>
            </button>

            <button
              type="button"
              onClick={onLeaveRoom}
              className="p-1.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Exit Game"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>

        {/* Round End Mini Notification in Landscape */}
        {roundEndData && (
          <div className="py-1 px-3 rounded-xl border border-amber-300 bg-amber-50 text-xs font-fun font-bold text-amber-800 flex items-center justify-between shadow-xs my-0.5 shrink-0">
            <span>Word was: <strong className="uppercase text-skribbl-blue">{roundEndData.word}</strong></span>
            <span>Next drawer: <strong className="text-slate-900">{roundEndData.nextDrawer}</strong></span>
          </div>
        )}

        {/* Landscape 2-Column Split: Canvas on Left (~62%), Chat on Right (~38%) */}
        <div className="flex-1 min-h-0 flex flex-row gap-2 overflow-hidden my-1">
          {/* Main Drawing Canvas Column */}
          <div className="w-[62%] h-full min-h-0 flex flex-col overflow-hidden">
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
              isLandscape={true}
              className="h-full min-h-0"
            />
          </div>

          {/* Chat & Guesses Column */}
          <div className="w-[38%] h-full min-h-0 flex flex-col overflow-hidden">
            <Chat
              messages={chatMessages}
              currentUser={currentUser}
              isDrawer={isDrawer}
              hasGuessed={currentUser?.hasGuessed}
              isDrawingPhase={phase === 'DRAWING'}
              onSendGuess={onSendGuess}
              onSendChat={onSendChat}
              isLandscape={true}
              className="h-full"
            />
          </div>
        </div>

        {/* Floating Leaderboard Modal for Landscape Mode */}
        {showLeaderboardModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border-2 border-skribbl-border shadow-skribbl max-w-sm w-full p-4 space-y-3 relative">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center space-x-1.5 font-fun font-bold text-slate-800 text-sm">
                  <Trophy size={16} className="text-amber-500" />
                  <span>Leaderboard</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaderboardModal(false)}
                  className="p-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <Leaderboard
                players={room.players}
                currentDrawerId={currentDrawerId}
                currentUserId={currentUser?.id}
              />
            </div>
          </div>
        )}

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
  }

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

        <div className="flex items-center space-x-2">
          {/* Rotate Screen Button on the right side of mobile game interface */}
          <button
            onClick={toggleLandscape}
            type="button"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-skribbl-blue text-white text-xs font-fun font-bold hover:bg-skribbl-blueDark transition-all cursor-pointer shadow-xs active:scale-95 lg:hidden"
            title="Rotate Screen / Landscape Mode"
          >
            <RotateCw size={14} />
            <span>Landscape</span>
          </button>

          <button
            onClick={onLeaveRoom}
            type="button"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-2xl bg-white border-2 border-rose-200 text-xs font-fun font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <LogOut size={14} />
            <span>Exit Game</span>
          </button>
        </div>
      </div>

      {/* Floating Mobile Rotate Button pinned on the right side */}
      <button
        onClick={toggleLandscape}
        type="button"
        className="fixed right-3 bottom-24 z-40 lg:hidden flex items-center space-x-1.5 px-3.5 py-2.5 rounded-full bg-skribbl-blue text-white text-xs font-fun font-bold shadow-lg border-2 border-white hover:bg-skribbl-blueDark transition-all cursor-pointer active:scale-90"
        title="Switch to Landscape Mode"
      >
        <RotateCw size={15} />
        <span>Landscape</span>
      </button>

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
