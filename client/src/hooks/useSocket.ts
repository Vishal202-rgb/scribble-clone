import { useState, useEffect, useCallback } from 'react';
import { socket } from '../services/socket';
import {
  RoomData,
  Player,
  RoomSettings,
  GameStateData,
  RoundStartData,
  RoundEndData,
  GameOverData,
  ChatMessage,
  DrawDataPoint,
  CompletedStroke,
  DrawingStroke,
  DrawingTool,
  NormalizedPoint
} from '../types';

export function useSocket() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Game state
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [wordOptions, setWordOptions] = useState<string[]>([]);
  const [roundEndData, setRoundEndData] = useState<RoundEndData | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Remote canvas signals
  const [remoteDrawData, setRemoteDrawData] = useState<DrawDataPoint | null>(null);
  const [remoteClearTrigger, setRemoteClearTrigger] = useState<number>(0);
  const [remoteUndoStrokes, setRemoteUndoStrokes] = useState<CompletedStroke[] | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setErrorMessage(null);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onError(data: { message: string }) {
      setIsLoading(false);
      setErrorMessage(data?.message || 'An unexpected error occurred.');
    }

    function onRoomCreated(res: { room: RoomData; player: Player }) {
      setIsLoading(false);
      setRoom(res.room);
      setCurrentUser(res.player);
      setChatMessages([]);
      setGameState(null);
      setGameOverData(null);
      setRoundEndData(null);
      setErrorMessage(null);
    }

    function onRoomJoined(res: { room: RoomData; player: Player }) {
      setIsLoading(false);
      setRoom(res.room);
      setCurrentUser(res.player);
      setChatMessages([]);
      setGameState(null);
      setGameOverData(null);
      setRoundEndData(null);
      setErrorMessage(null);
    }

    function onPlayerJoined(data: { player: Player; players: Player[]; room?: RoomData }) {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: data.players,
          playerCount: data.players.length,
          ...(data.room ? data.room : {})
        };
      });
      // System message
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_${Math.random()}`,
          system: true,
          text: `${data.player.name} joined the room.`,
          timestamp: Date.now()
        }
      ]);
    }

    function onPlayerLeft(data: { playerId: string; players: Player[]; hostId?: string; room?: RoomData }) {
      setRoom((prev) => {
        if (!prev) return null;
        const updatedHostId = data.hostId || prev.hostId;
        return {
          ...prev,
          players: data.players,
          playerCount: data.players.length,
          hostId: updatedHostId,
          ...(data.room ? data.room : {})
        };
      });

      // Update current user if promoted to host
      setCurrentUser((prev) => {
        if (!prev) return null;
        if (data.hostId && data.hostId === prev.id) {
          return { ...prev, isHost: true };
        }
        return prev;
      });

      // System message
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_${Math.random()}`,
          system: true,
          text: 'A player left the room.',
          timestamp: Date.now()
        }
      ]);
    }

    // Game lifecycle events
    function onGameState(data: GameStateData) {
      setGameState(data);
      if (data.phase === 'DRAWING' || data.phase === 'CHOOSING_WORD') {
        setRoundEndData(null);
      }
      if (data.phase === 'GAME_OVER') {
        setWordOptions([]);
      }
      if (data.drawerId) {
        setRoom((prev) => (prev ? { ...prev, currentDrawerId: data.drawerId } : prev));
        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            isDrawing: prev.id === data.drawerId
          };
        });
      }
    }

    function onRoundStart(data: RoundStartData) {
      setRoundEndData(null);
      // Immediately reset previous drawing canvas
      setRemoteClearTrigger((prev) => prev + 1);

      if (data.wordOptions && data.wordOptions.length > 0) {
        setWordOptions(data.wordOptions);
      } else {
        setWordOptions([]);
      }

      if (data.drawerId) {
        setRoom((prev) => {
          if (!prev) return null;
          const players = data.players || prev.players.map((p) => ({
            ...p,
            hasGuessed: false,
            roundScore: 0,
            isDrawing: p.id === data.drawerId
          }));
          return {
            ...prev,
            currentDrawerId: data.drawerId,
            currentRound: data.round,
            totalRounds: data.totalRounds,
            players
          };
        });

        setCurrentUser((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            hasGuessed: false,
            roundScore: 0,
            isDrawing: prev.id === data.drawerId
          };
        });
      }
    }

    function onRoundEnd(data: RoundEndData) {
      setRoundEndData(data);
      setWordOptions([]);
      if (data.scores) {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: data.scores
          };
        });

        setCurrentUser((prev) => {
          if (!prev) return null;
          const me = data.scores.find((p) => p.id === prev.id);
          return me ? { ...prev, ...me } : prev;
        });
      }
    }

    function onGameOver(data: GameOverData) {
      setGameOverData(data);
      setRoundEndData(null);
      setWordOptions([]);
    }

    function onGuessResult(data: { correct: boolean; playerId: string; playerName: string; points: number; leaderboard?: Player[] }) {
      if (data.leaderboard) {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: data.leaderboard!
          };
        });
      }

      setCurrentUser((prev) => {
        if (!prev) return null;
        if (prev.id === data.playerId && data.correct) {
          return {
            ...prev,
            hasGuessed: true,
            score: prev.score + (data.points || 0)
          };
        }
        return prev;
      });
    }

    function onLeaderboardUpdate(data: { players: Player[] }) {
      if (data.players) {
        setRoom((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            players: data.players
          };
        });

        setCurrentUser((prev) => {
          if (!prev) return null;
          const me = data.players.find((p) => p.id === prev.id);
          return me ? { ...prev, ...me } : prev;
        });
      }
    }

    function onTimerTick(data: { timeLeft: number }) {
      setGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          timeLeft: data.timeLeft
        };
      });
    }

    function onChatMessage(data: { playerId?: string; playerName?: string; text: string; system?: boolean; alreadyGuessed?: boolean }) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_${Math.random()}`,
          playerId: data.playerId,
          playerName: data.playerName,
          text: data.text,
          system: data.system,
          alreadyGuessed: data.alreadyGuessed,
          timestamp: Date.now()
        }
      ]);
    }

    // Drawing sync events
    function onDrawData(data: DrawDataPoint) {
      setRemoteDrawData(data);
    }

    function onCanvasClear() {
      setRemoteClearTrigger((prev) => prev + 1);
    }

    function onDrawUndo(data: { strokes: CompletedStroke[] }) {
      setRemoteUndoStrokes(data.strokes);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error_message', onError);
    socket.on('room_created', onRoomCreated);
    socket.on('room_joined', onRoomJoined);
    socket.on('player_joined', onPlayerJoined);
    socket.on('player_left', onPlayerLeft);
    socket.on('game_state', onGameState);
    socket.on('round_start', onRoundStart);
    socket.on('round_end', onRoundEnd);
    socket.on('game_over', onGameOver);
    socket.on('guess_result', onGuessResult);
    socket.on('leaderboard_update', onLeaderboardUpdate);
    socket.on('timer_tick', onTimerTick);
    socket.on('chat_message', onChatMessage);
    socket.on('draw_data', onDrawData);
    socket.on('canvas_clear', onCanvasClear);
    socket.on('draw_undo', onDrawUndo);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error_message', onError);
      socket.off('room_created', onRoomCreated);
      socket.off('room_joined', onRoomJoined);
      socket.off('player_joined', onPlayerJoined);
      socket.off('player_left', onPlayerLeft);
      socket.off('game_state', onGameState);
      socket.off('round_start', onRoundStart);
      socket.off('round_end', onRoundEnd);
      socket.off('game_over', onGameOver);
      socket.off('guess_result', onGuessResult);
      socket.off('leaderboard_update', onLeaderboardUpdate);
      socket.off('timer_tick', onTimerTick);
      socket.off('chat_message', onChatMessage);
      socket.off('draw_data', onDrawData);
      socket.off('canvas_clear', onCanvasClear);
      socket.off('draw_undo', onDrawUndo);
    };
  }, []);

  const createRoom = useCallback((hostName: string, settings?: Partial<RoomSettings>) => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('create_room', { hostName, settings }, (response?: { success: boolean; error?: string }) => {
      if (response && !response.success) {
        setIsLoading(false);
        setErrorMessage(response.error || 'Failed to create room.');
      }
    });
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    socket.emit('join_room', { roomId, playerName }, (response?: { success: boolean; error?: string }) => {
      if (response && !response.success) {
        setIsLoading(false);
        setErrorMessage(response.error || 'Failed to join room.');
      }
    });
  }, []);

  const leaveRoom = useCallback(() => {
    if (room) {
      socket.emit('leave_room', { roomId: room.roomId, playerId: currentUser?.id });
    }
    setRoom(null);
    setCurrentUser(null);
    setGameState(null);
    setGameOverData(null);
    setRoundEndData(null);
    setWordOptions([]);
    setChatMessages([]);
    setErrorMessage(null);
    setIsLoading(false);
  }, [room, currentUser]);

  const startGame = useCallback(() => {
    socket.emit('start_game', {}, (res?: { success: boolean; error?: string }) => {
      if (res && !res.success) {
        setErrorMessage(res.error || 'Could not start game.');
      }
    });
  }, []);

  const chooseWord = useCallback((word: string) => {
    socket.emit('word_chosen', { word });
    setWordOptions([]);
  }, []);

  const sendDrawStart = useCallback((x: number, y: number, color: string, size: number) => {
    socket.emit('draw_start', { x, y, color, size });
  }, []);

  const sendDrawMove = useCallback((x: number, y: number) => {
    socket.emit('draw_move', { x, y });
  }, []);

  const sendDrawEnd = useCallback(() => {
    socket.emit('draw_end');
  }, []);

  const sendStrokeStart = useCallback(
    (strokeId: string, tool: DrawingTool, color: string, brushSize: number, point: NormalizedPoint, sequence = 0) => {
      socket.emit('stroke_start', { strokeId, tool, color, brushSize, point, sequence, timestamp: Date.now() });
    },
    []
  );

  const sendStrokeChunk = useCallback((strokeId: string, points: NormalizedPoint[], sequence = 0) => {
    socket.emit('stroke_chunk', { strokeId, points, sequence });
  }, []);

  const sendStrokeEnd = useCallback((strokeId: string, finalStroke?: Partial<DrawingStroke>) => {
    socket.emit('stroke_end', { strokeId, finalStroke });
  }, []);

  const requestCanvasState = useCallback(() => {
    socket.emit('get_canvas_state');
  }, []);

  const clearCanvas = useCallback(() => {
    socket.emit('canvas_clear');
  }, []);

  const undoDrawing = useCallback(() => {
    socket.emit('draw_undo');
  }, []);

  const sendGuess = useCallback((text: string) => {
    socket.emit('guess', { text });
  }, []);

  const sendChat = useCallback((text: string) => {
    socket.emit('chat', { text });
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
    socket,
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
    sendStrokeStart,
    sendStrokeChunk,
    sendStrokeEnd,
    requestCanvasState,
    clearCanvas,
    undoDrawing,
    sendGuess,
    sendChat,
    clearError
  };
}
