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
    <div className="min-h-screen bg-mono-light text-mono-text flex flex-col justify-between selection:bg-mono-text selection:text-mono-white">
      {/* Top Navbar */}
      <header className="bg-mono-white border-b border-mono-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            onClick={() => {
              if (!room) setView('HOME');
            }}
            className="flex items-center space-x-2 cursor-pointer select-none"
          >
            <div className="w-7 h-7 rounded-lg bg-mono-text text-mono-white flex items-center justify-center font-black text-sm font-mono tracking-tighter">
              S
            </div>
            <span className="font-bold text-base tracking-tight text-mono-text font-mono">
              SKRIBBL
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {isConnected ? (
              <div className="inline-flex items-center space-x-1.5 text-mono-secondary">
                <span className="w-2 h-2 rounded-full bg-mono-text animate-pulse" />
                <span className="font-mono text-[11px]">Online</span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-1.5 text-mono-secondary">
                <span className="w-2 h-2 rounded-full bg-mono-secondary" />
                <span className="font-mono text-[11px]">Offline</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex items-center justify-center">
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
      <footer className="border-t border-mono-border bg-mono-white py-3 text-center text-xs text-mono-secondary">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Skribbl Clone &mdash; Real-Time Multiplayer Drawing &amp; Guessing</span>
          <span className="font-mono text-[11px]">Strict Monochromatic Theme</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
