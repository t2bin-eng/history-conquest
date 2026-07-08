import { create } from "zustand";
import type { EventLog, EventType, Game, Question, Team, TeamMember } from "@/types/game";
import { generateMockRegions } from "@/data/mockRegions";
import { drawQuestion } from "@/data/mockQuestions";
import {
  applySurroundCaptures,
  canChallengeRegion,
  reconquestCooldownUntil,
  syncTeamOwnedRegions,
} from "@/lib/regionRules";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function logEvent(
  type: EventType,
  regionId: string,
  teamId: string,
  payload: Record<string, unknown> = {}
): EventLog {
  return {
    id: createId("event"),
    timestamp: new Date().toISOString(),
    type,
    regionId,
    teamId,
    actorMemberName: null,
    payload,
  };
}

export interface ActiveChallenge {
  regionId: string;
  teamId: string;
  question: Question;
}

interface GameStore {
  game: Game;
  /** 현재 브라우저 세션이 조작 중인 팀 (학생 화면용) */
  myTeamId: string | null;
  activeChallenge: ActiveChallenge | null;

  registerTeam: (name: string, color: string) => string;
  setMyTeam: (teamId: string) => void;
  addMember: (teamId: string, name: string) => void;
  removeMember: (teamId: string, memberId: string) => void;
  setTeamColor: (teamId: string, color: string) => void;
  setTeamFlag: (teamId: string, flagImageUrl: string) => void;
  setStartingRegion: (teamId: string, regionId: string | null) => void;
  setReady: (teamId: string, isReady: boolean) => void;
  setTimeLimitSec: (timeLimitSec: number) => void;
  startGame: () => void;
  endGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  startChallenge: (regionId: string, teamId: string) => boolean;
  submitChallengeAnswer: (selectedAnswer: string) => boolean;
  cancelChallenge: () => void;
}

const initialGame: Game = {
  id: createId("game"),
  status: "WAITING",
  timeLimitSec: 20 * 60,
  startedAt: null,
  endedAt: null,
  isPaused: false,
  pausedAt: null,
  comebackAssist: false,
  regions: generateMockRegions(),
  teams: [],
  eventLogs: [],
};

export const useGameStore = create<GameStore>((set, get) => ({
  game: initialGame,
  myTeamId: null,
  activeChallenge: null,

  registerTeam: (name, color) => {
    const id = createId("team");
    const newTeam: Team = {
      id,
      name,
      color,
      flagImageUrl: null,
      members: [],
      score: 0,
      ownedRegionIds: [],
      cards: [],
      comboStreak: 0,
      isReady: false,
      startingRegionId: null,
    };
    set((state) => ({
      game: { ...state.game, teams: [...state.game.teams, newTeam] },
      myTeamId: id,
    }));
    return id;
  },

  setMyTeam: (teamId) => set({ myTeamId: teamId }),

  addMember: (teamId, name) => {
    const member: TeamMember = { id: createId("member"), name };
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId ? { ...t, members: [...t.members, member] } : t
        ),
      },
    }));
  },

  removeMember: (teamId, memberId) => {
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId
            ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
            : t
        ),
      },
    }));
  },

  setTeamColor: (teamId, color) => {
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId ? { ...t, color } : t
        ),
      },
    }));
  },

  setTeamFlag: (teamId, flagImageUrl) => {
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId ? { ...t, flagImageUrl } : t
        ),
      },
    }));
  },

  setStartingRegion: (teamId, regionId) => {
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId ? { ...t, startingRegionId: regionId } : t
        ),
      },
    }));
  },

  setReady: (teamId, isReady) => {
    set((state) => ({
      game: {
        ...state.game,
        teams: state.game.teams.map((t) =>
          t.id === teamId ? { ...t, isReady } : t
        ),
      },
    }));
  },

  setTimeLimitSec: (timeLimitSec) => {
    set((state) => ({ game: { ...state.game, timeLimitSec } }));
  },

  startGame: () => {
    set((state) => {
      const cooldownUntil = reconquestCooldownUntil();
      const regions = state.game.regions.map((r) => {
        const owner = state.game.teams.find((t) => t.startingRegionId === r.id);
        return owner
          ? { ...r, ownerTeamId: owner.id, status: "OWNED" as const, cooldownUntil }
          : r;
      });
      const teams = syncTeamOwnedRegions(state.game.teams, regions);
      return {
        game: {
          ...state.game,
          status: "PLAYING",
          startedAt: new Date().toISOString(),
          teams,
          regions,
        },
      };
    });
  },

  endGame: () => {
    set((state) => ({
      game: { ...state.game, status: "ENDED", endedAt: new Date().toISOString() },
      activeChallenge: null,
    }));
  },

  pauseGame: () => {
    set((state) => {
      if (state.game.status !== "PLAYING" || state.game.isPaused) return state;
      return { game: { ...state.game, isPaused: true, pausedAt: new Date().toISOString() } };
    });
  },

  resumeGame: () => {
    set((state) => {
      if (!state.game.isPaused || !state.game.pausedAt || !state.game.startedAt) return state;
      const pausedMs = Date.now() - new Date(state.game.pausedAt).getTime();
      const shiftedStartedAt = new Date(
        new Date(state.game.startedAt).getTime() + pausedMs
      ).toISOString();
      return {
        game: { ...state.game, isPaused: false, pausedAt: null, startedAt: shiftedStartedAt },
      };
    });
  },

  startChallenge: (regionId, teamId) => {
    const { game } = get();
    const region = game.regions.find((r) => r.id === regionId);
    if (!region || game.status !== "PLAYING" || game.isPaused) return false;
    if (!canChallengeRegion(region, teamId)) return false;

    const question = drawQuestion(region.difficulty, regionId, teamId);
    set({ activeChallenge: { regionId, teamId, question } });
    return true;
  },

  submitChallengeAnswer: (selectedAnswer) => {
    const { game, activeChallenge } = get();
    if (!activeChallenge) return false;

    const region = game.regions.find((r) => r.id === activeChallenge.regionId);
    if (!region) {
      set({ activeChallenge: null });
      return false;
    }

    const correct = selectedAnswer === activeChallenge.question.answer;

    if (!correct) {
      const regions = game.regions.map((r) =>
        r.id === region.id
          ? { ...r, failedTeamIds: [...r.failedTeamIds, activeChallenge.teamId] }
          : r
      );
      const teams = game.teams.map((t) =>
        t.id === activeChallenge.teamId ? { ...t, comboStreak: 0 } : t
      );
      set({
        game: {
          ...game,
          regions,
          teams,
          eventLogs: [
            ...game.eventLogs,
            logEvent("WRONG_ANSWER", region.id, activeChallenge.teamId),
          ],
        },
        activeChallenge: null,
      });
      return false;
    }

    const wasOwnedByOther = region.status === "OWNED" && !!region.ownerTeamId;

    let regions = game.regions.map((r) =>
      r.id === region.id
        ? {
            ...r,
            ownerTeamId: activeChallenge.teamId,
            status: "OWNED" as const,
            cooldownUntil: reconquestCooldownUntil(),
            failedTeamIds: [],
          }
        : r
    );

    const surroundResult = applySurroundCaptures(regions);
    regions = surroundResult.regions;

    let teams = syncTeamOwnedRegions(game.teams, regions);
    teams = teams.map((t) =>
      t.id === activeChallenge.teamId
        ? { ...t, score: t.score + region.points, comboStreak: t.comboStreak + 1 }
        : t
    );

    const captureEvent = logEvent(
      wasOwnedByOther ? "RECONQUEST" : "CAPTURE",
      region.id,
      activeChallenge.teamId,
      { points: region.points }
    );
    const surroundEvents = surroundResult.captures.map((c) =>
      logEvent("SURROUND", c.regionId, c.teamId)
    );

    set({
      game: {
        ...game,
        regions,
        teams,
        eventLogs: [...game.eventLogs, captureEvent, ...surroundEvents],
      },
      activeChallenge: null,
    });
    return true;
  },

  cancelChallenge: () => set({ activeChallenge: null }),
}));

export function isColorTaken(teams: Team[], color: string, excludeTeamId?: string) {
  return teams.some((t) => t.color === color && t.id !== excludeTeamId);
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}
