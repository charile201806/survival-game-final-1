export enum PlayerStatus {
  SURVIVOR = 'SURVIVOR',
  INFECTED = 'INFECTED',
  ELIMINATED = 'ELIMINATED'
}

export interface Player {
  id: string;
  name: string;
  status: PlayerStatus;
  joinedAt: number;
  statusChangedAt: number;
  note?: string;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  playerName: string;
  type: 'JOIN' | 'STATUS_CHANGE' | 'DELETE';
  detail: string;
}

export interface GameStats {
  total: number;
  survivors: number;
  infected: number;
  eliminated: number;
}

export interface RoomData {
  players: Player[];
  events: GameEvent[];
  lastUpdate: number;
}
