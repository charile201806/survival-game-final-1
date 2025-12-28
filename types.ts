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

export interface GameStats {
  total: number;
  survivors: number;
  infected: number;
  eliminated: number;
}