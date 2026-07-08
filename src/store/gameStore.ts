import { create } from "zustand";
import type { Game, Team, TeamMember } from "@/types/game";
import { generateMockRegions } from "@/data/mockRegions";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface GameStore {
  game: Game;
  /** 현재 브라우저 세션이 조작 중인 팀 (학생 화면용) */
  myTeamId: string | null;

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
}

const initialGame: Game = {
  id: createId("game"),
  status: "WAITING",
  timeLimitSec: 20 * 60,
  startedAt: null,
  endedAt: null,
  comebackAssist: false,
  regions: generateMockRegions(),
  teams: [],
  eventLogs: [],
};

export const useGameStore = create<GameStore>((set) => ({
  game: initialGame,
  myTeamId: null,

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
      const teams = state.game.teams.map((t) =>
        t.startingRegionId ? { ...t, ownedRegionIds: [t.startingRegionId] } : t
      );
      const regions = state.game.regions.map((r) => {
        const owner = teams.find((t) => t.startingRegionId === r.id);
        return owner
          ? { ...r, ownerTeamId: owner.id, status: "OWNED" as const }
          : r;
      });
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
}));

export function isColorTaken(teams: Team[], color: string, excludeTeamId?: string) {
  return teams.some((t) => t.color === color && t.id !== excludeTeamId);
}
