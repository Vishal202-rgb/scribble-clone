import React, { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { ViewState } from './types';
import { HomePage } from './pages/HomePage';
import { CreateRoomPage } from './pages/CreateRoomPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';

export const App: React.FC = () => {
  const {
    isConnected,
    room,
    currentUser,
    errorMessage,
    isLoading,
    gameState,
    wordOptions,
    roundEndData,
    gameOverData,
    chatMessages,
    remoteDrawData,
    remoteClearTrigger,
    remoteUndoStrokes,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    chooseWord,
    sendDrawStart,
    sendDrawMove,
    sendDrawEnd,
    clearCanvas,
    undoDrawing,
    sendGuess,
    sendChat,
    clearError
  } = useSocket();

  const [nickname, setNickname] = useState<string>(() => {
    return localStorage.getItem('skribbl_nickname') || '';
  });

  const [view, setView] = useState<ViewState>('HOME');
  const [initialRoomCode, setInitialRoomCode] = useState<string>('');

  // Check URL query parameters for invite link (e.g. ?room=ABCD12)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomCode(roomParam.toUpperCase());
      setView('JOIN');
    }
  }, []);

  const handleNicknameChange = (name: string) => {
    setNickname(name);
    localStorage.setItem('skribbl_nickname', name);
  };

  const handleCreateRoom = (hostName: string, settings: any) => {
    handleNicknameChange(hostName);
    createRoom(hostName, settings);
  };

  const handleJoinRoom = (roomId: string, playerName: string) => {
    handleNicknameChange(playerName);
    joinRoom(roomId, playerName);
  };

  const handleLeaveRoom = () => {
    leaveRoom();
    setView('HOME');
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const isInGame = Boolean(
    room &&
      (room.gameState === 'IN_GAME' ||
        (gameState && gameState.phase !== 'LOBBY'))
  );

  return (
    <div className="min-h-screen skribbl-doodle-bg text-slate-800 flex flex-col justify-between selection:bg-skribbl-blue selection:text-white font-sans">
      {/* Top Navbar */}
      <header className={`bg-white/90 backdrop-blur-md border-b-2 border-skribbl-border sticky top-0 z-30 shadow-xs ${isInGame ? 'hide-on-mobile-landscape' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            onClick={() => {
              if (!room) setView('HOME');
            }}
            className="flex items-center space-x-1.5 cursor-pointer select-none group"
          >
            <div className="flex items-center space-x-0.5 font-fun font-bold text-xl sm:text-2xl tracking-tight">
              <span className="text-amber-500 group-hover:-translate-y-0.5 transition-transform">s</span>
              <span className="text-sky-500 group-hover:translate-y-0.5 transition-transform">k</span>
              <span className="text-rose-500 group-hover:-translate-y-0.5 transition-transform">r</span>
              <span className="text-emerald-500 group-hover:translate-y-0.5 transition-transform">i</span>
              <span className="text-violet-500 group-hover:-translate-y-0.5 transition-transform">b</span>
              <span className="text-orange-500 group-hover:translate-y-0.5 transition-transform">b</span>
              <span className="text-teal-500 group-hover:-translate-y-0.5 transition-transform">l</span>
              <span className="text-slate-400 text-sm font-fun font-bold ml-0.5 self-end mb-0.5">.io</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {isConnected ? (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-fun font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-fun font-bold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Connecting...</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto flex items-center justify-center ${isInGame ? 'p-1 sm:p-4 md:p-6 mobile-landscape-fill' : 'p-4 sm:p-6'}`}>
        {room ? (
          isInGame ? (
            <GamePage
              room={room}
              currentUser={currentUser}
              gameState={gameState}
              wordOptions={wordOptions}
              roundEndData={roundEndData}
              gameOverData={gameOverData}
              chatMessages={chatMessages}
              remoteDrawData={remoteDrawData}
              remoteClearTrigger={remoteClearTrigger}
              remoteUndoStrokes={remoteUndoStrokes}
              onChooseWord={chooseWord}
              onDrawStart={sendDrawStart}
              onDrawMove={sendDrawMove}
              onDrawEnd={sendDrawEnd}
              onClearCanvas={clearCanvas}
              onUndoDrawing={undoDrawing}
              onSendGuess={sendGuess}
              onSendChat={sendChat}
              onStartGame={startGame}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : (
            <LobbyPage
              room={room}
              currentUser={currentUser}
              onLeave={handleLeaveRoom}
              onStartGame={startGame}
            />
          )
        ) : view === 'CREATE' ? (
          <CreateRoomPage
            initialNickname={nickname}
            onBack={() => {
              clearError();
              setView('HOME');
            }}
            onCreate={handleCreateRoom}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : view === 'JOIN' ? (
          <JoinRoomPage
            initialNickname={nickname}
            initialRoomCode={initialRoomCode}
            onBack={() => {
              clearError();
              setView('HOME');
            }}
            onJoin={handleJoinRoom}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        ) : (
          <HomePage
            nickname={nickname}
            onNicknameChange={handleNicknameChange}
            onNavigate={(nextView) => {
              clearError();
              setView(nextView);
            }}
            isConnected={isConnected}
            errorMessage={errorMessage}
            onClearError={clearError}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t-2 border-skribbl-border bg-white py-3.5 text-center text-xs text-slate-500 font-fun ${isInGame ? 'hide-on-mobile-landscape' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-bold text-slate-600">Skribbl Clone &mdash; Real-Time Multiplayer Drawing &amp; Guessing</span>
          <span className="text-slate-400">Play with friends in custom rooms</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
