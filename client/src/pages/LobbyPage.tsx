import React from 'react';
import { RoomData, Player } from '../types';
import { Lobby } from '../components/Lobby';

interface LobbyPageProps {
  room: RoomData;
  currentUser: Player | null;
  onLeave: () => void;
  onStartGame: () => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({
  room,
  currentUser,
  onLeave,
  onStartGame
}) => {
  return (
    <Lobby
      room={room}
      currentUser={currentUser}
      onLeave={onLeave}
      onStartGame={onStartGame}
    />
  );
};
