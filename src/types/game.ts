export type GameStatus = "WAITING" | "PLAYING" | "GOLDEN_TIME" | "ENDED";

export type RegionDifficulty = "LOW" | "MID" | "HIGH";

export type RegionStatus = "NEUTRAL" | "OWNED" | "CONTESTED" | "COOLDOWN";

export type CardType =
  | "TIME_STOP"
  | "HINT"
  | "SHIELD"
  | "SURPRISE_ATTACK"
  | "SCOUT";

export type EventType =
  | "CAPTURE"
  | "RECONQUEST"
  | "SURROUND"
  | "WRONG_ANSWER"
  | "CARD_USED";

export interface Card {
  id: string;
  type: CardType;
  label: string;
  description: string;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  flagImageUrl: string | null;
  members: TeamMember[];
  score: number;
  ownedRegionIds: string[];
  cards: Card[];
  comboStreak: number;
  isReady: boolean;
  startingRegionId: string | null;
}

export interface Region {
  id: string;
  name: string;
  difficulty: RegionDifficulty;
  points: number;
  ownerTeamId: string | null;
  status: RegionStatus;
  cooldownUntil: string | null;
  adjacentRegionIds: string[];
  failedTeamIds: string[];
  /** SVG path data for map rendering */
  svgPath: string;
  /** label position for name/flag placement */
  labelPosition: { x: number; y: number };
}

export interface Question {
  id: string;
  regionId: string;
  teamId: string;
  category: string;
  difficulty: RegionDifficulty;
  text: string;
  choices: string[];
  answer: string;
  timeLimitSec: number;
}

export interface EventLog {
  id: string;
  timestamp: string;
  type: EventType;
  regionId: string;
  teamId: string;
  actorMemberName: string | null;
  payload: Record<string, unknown>;
}

export interface Game {
  id: string;
  status: GameStatus;
  timeLimitSec: number;
  startedAt: string | null;
  endedAt: string | null;
  comebackAssist: boolean;
  regions: Region[];
  teams: Team[];
  eventLogs: EventLog[];
}
