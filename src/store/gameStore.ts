import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Game, Team } from "@/types/game";
import type { RpcQuestion } from "@/lib/supabase/types";
import * as api from "@/lib/supabase/queries";
import { subscribeToGame, unsubscribeFromGame } from "@/lib/supabase/realtime";

export interface ActiveChallenge {
  regionId: string;
  teamId: string;
  question: RpcQuestion;
}

const EMPTY_GAME: Game = {
  id: "",
  status: "WAITING",
  timeLimitSec: 1200,
  startedAt: null,
  endedAt: null,
  isPaused: false,
  pausedAt: null,
  comebackAssist: false,
  regions: [],
  teams: [],
  eventLogs: [],
};

interface GameStore {
  game: Game;
  gameId: string | null;
  gameCode: string | null;
  myTeamId: string | null;
  activeChallenge: ActiveChallenge | null;
  isConnected: boolean;
  isLoading: boolean;
  _channel: RealtimeChannel | null;

  createNewGame: (timeLimitSec: number) => Promise<string>;
  joinGameByCode: (code: string) => Promise<boolean>;
  reconnect: () => Promise<void>;
  leaveGame: () => void;
  refreshGame: () => Promise<void>;

  setMyTeam: (teamId: string) => void;
  registerTeam: (name: string, color: string) => Promise<string>;
  addMember: (teamId: string, name: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  setTeamColor: (teamId: string, color: string) => Promise<void>;
  setTeamFlag: (teamId: string, flagImageUrl: string) => Promise<void>;
  setStartingRegion: (teamId: string, regionId: string | null) => Promise<void>;
  setReady: (teamId: string, isReady: boolean) => Promise<void>;
  setTimeLimitSec: (timeLimitSec: number) => Promise<void>;
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;

  startChallenge: (regionId: string, teamId: string) => Promise<boolean>;
  submitChallengeAnswer: (selectedAnswer: string) => Promise<boolean>;
  cancelChallenge: () => void;
}

async function connectToGame(
  gameId: string,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
) {
  const prevChannel = get()._channel;
  if (prevChannel) unsubscribeFromGame(prevChannel);

  set({ isLoading: true });
  const game = await api.fetchFullGame(gameId);
  const channel = subscribeToGame(gameId, () => {
    get().refreshGame();
  });
  set({ game, isConnected: true, isLoading: false, _channel: channel });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      game: EMPTY_GAME,
      gameId: null,
      gameCode: null,
      myTeamId: null,
      activeChallenge: null,
      isConnected: false,
      isLoading: false,
      _channel: null,

      createNewGame: async (timeLimitSec) => {
        const row = await api.createGame(timeLimitSec);
        set({ gameId: row.id, gameCode: row.code });
        await connectToGame(row.id, set, get);
        return row.code;
      },

      joinGameByCode: async (code) => {
        const row = await api.getGameByCode(code);
        if (!row) return false;
        set({ gameId: row.id, gameCode: row.code });
        await connectToGame(row.id, set, get);
        return true;
      },

      reconnect: async () => {
        const { gameId, isConnected } = get();
        if (!gameId || isConnected) return;
        await connectToGame(gameId, set, get);
      },

      leaveGame: () => {
        const channel = get()._channel;
        if (channel) unsubscribeFromGame(channel);
        set({
          game: EMPTY_GAME,
          gameId: null,
          gameCode: null,
          myTeamId: null,
          activeChallenge: null,
          isConnected: false,
          _channel: null,
        });
      },

      refreshGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        const game = await api.fetchFullGame(gameId);
        set({ game });
      },

      setMyTeam: (teamId) => set({ myTeamId: teamId }),

      registerTeam: async (name, color) => {
        const { gameId } = get();
        if (!gameId) throw new Error("게임에 연결되어 있지 않습니다.");
        const teamId = await api.registerTeam(gameId, name, color);
        set({ myTeamId: teamId });
        await get().refreshGame();
        return teamId;
      },

      addMember: async (teamId, name) => {
        const { gameId } = get();
        if (!gameId) return;
        await api.addMember(gameId, teamId, name);
        await get().refreshGame();
      },

      removeMember: async (memberId) => {
        await api.removeMember(memberId);
        await get().refreshGame();
      },

      setTeamColor: async (teamId, color) => {
        await api.updateTeam(teamId, { color });
        await get().refreshGame();
      },

      setTeamFlag: async (teamId, flagImageUrl) => {
        await api.updateTeam(teamId, { flag_image_url: flagImageUrl });
        await get().refreshGame();
      },

      setStartingRegion: async (teamId, regionId) => {
        await api.updateTeam(teamId, { starting_region_key: regionId });
        await get().refreshGame();
      },

      setReady: async (teamId, isReady) => {
        await api.updateTeam(teamId, { is_ready: isReady });
        await get().refreshGame();
      },

      setTimeLimitSec: async (timeLimitSec) => {
        const { gameId } = get();
        if (!gameId) return;
        await api.setTimeLimitSec(gameId, timeLimitSec);
        await get().refreshGame();
      },

      startGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        await api.startGame(gameId);
        await get().refreshGame();
      },

      endGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        await api.endGame(gameId);
        set({ activeChallenge: null });
        await get().refreshGame();
      },

      pauseGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        await api.pauseGame(gameId);
        await get().refreshGame();
      },

      resumeGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        await api.resumeGame(gameId);
        await get().refreshGame();
      },

      startChallenge: async (regionId, teamId) => {
        const { gameId } = get();
        if (!gameId) return false;
        const result = await api.startChallenge(gameId, regionId, teamId);
        if (!result.success || !result.question) return false;
        set({ activeChallenge: { regionId, teamId, question: result.question } });
        return true;
      },

      submitChallengeAnswer: async (selectedAnswer) => {
        const { gameId, activeChallenge } = get();
        if (!gameId || !activeChallenge) return false;
        const result = await api.submitCapture(
          gameId,
          activeChallenge.regionId,
          activeChallenge.teamId,
          activeChallenge.question.id,
          selectedAnswer
        );
        set({ activeChallenge: null });
        await get().refreshGame();
        return result.correct ?? false;
      },

      cancelChallenge: () => set({ activeChallenge: null }),
    }),
    {
      name: "history-conquest-session",
      partialize: (state) => ({
        gameId: state.gameId,
        gameCode: state.gameCode,
        myTeamId: state.myTeamId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.reconnect();
      },
    }
  )
);

export function isColorTaken(teams: Team[], color: string, excludeTeamId?: string) {
  return teams.some((t) => t.color === color && t.id !== excludeTeamId);
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}
