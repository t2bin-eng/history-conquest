import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Game, Team } from "@/types/game";
import type { RpcQuestion } from "@/lib/supabase/types";
import * as api from "@/lib/supabase/queries";
import {
  subscribeToGame,
  unsubscribeFromGame,
  type ConnectionStatus,
} from "@/lib/supabase/realtime";

export interface ActiveChallenge {
  regionId: string;
  teamId: string;
  question: RpcQuestion;
  isBettingZone: boolean;
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
  classNumber: null,
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
  connectionStatus: ConnectionStatus;
  isLoading: boolean;
  _channel: RealtimeChannel[] | null;
  _pollInterval: ReturnType<typeof setInterval> | null;

  createNewGame: (timeLimitSec: number, classNumber: number) => Promise<string>;
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
  setStartingRegion: (teamId: string, regionId: string | null) => Promise<boolean>;
  setReady: (teamId: string, isReady: boolean) => Promise<void>;
  setTimeLimitSec: (timeLimitSec: number) => Promise<void>;
  setComebackAssist: (enabled: boolean) => Promise<void>;
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  pauseGame: () => Promise<void>;
  resumeGame: () => Promise<void>;

  startChallenge: (
    regionId: string,
    teamId: string
  ) => Promise<{ started: boolean; retryAt: string | null }>;
  submitChallengeAnswer: (selectedAnswer: string) => Promise<{
    correct: boolean;
    pointsAwarded: number;
    bonusApplied: boolean;
    bettingZone: boolean;
    pointsLost: number;
    retryAt: string | null;
  }>;
  cancelChallenge: () => void;
}

// 모바일에서 화면이 꺼지거나 백그라운드로 전환되면 Realtime 소켓이 겉으로는
// "연결됨" 상태를 유지한 채 조용히 업데이트를 놓치는 경우가 있다 (특히 교사가
// 게임을 강제 종료했는데 학생 화면이 넘어가지 않는 문제로 나타남). Realtime을
// 믿기만 하지 않고, 주기적으로 게임 상태를 직접 다시 받아와 그 간극을 메운다.
const POLL_INTERVAL_MS = 5000;

async function connectToGame(
  gameId: string,
  set: (partial: Partial<GameStore>) => void,
  get: () => GameStore
) {
  const prevChannel = get()._channel;
  if (prevChannel) unsubscribeFromGame(prevChannel);
  const prevPoll = get()._pollInterval;
  if (prevPoll) clearInterval(prevPoll);

  set({ isLoading: true });
  const game = await api.fetchFullGame(gameId);
  const channel = subscribeToGame(
    gameId,
    () => {
      get().refreshGame();
    },
    (status) => set({ connectionStatus: status, isConnected: status === "connected" })
  );
  const pollInterval = setInterval(() => {
    get().refreshGame();
  }, POLL_INTERVAL_MS);
  set({
    game,
    isConnected: true,
    connectionStatus: "connected",
    isLoading: false,
    _channel: channel,
    _pollInterval: pollInterval,
  });
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
      connectionStatus: "disconnected",
      isLoading: false,
      _channel: null,
      _pollInterval: null,

      createNewGame: async (timeLimitSec, classNumber) => {
        const row = await api.createGame(timeLimitSec, classNumber);
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
        const pollInterval = get()._pollInterval;
        if (pollInterval) clearInterval(pollInterval);
        set({
          game: EMPTY_GAME,
          gameId: null,
          gameCode: null,
          myTeamId: null,
          activeChallenge: null,
          isConnected: false,
          connectionStatus: "disconnected",
          _channel: null,
          _pollInterval: null,
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
        if (regionId === null) {
          await api.updateTeam(teamId, { starting_region_key: null });
          await get().refreshGame();
          return true;
        }

        const { gameId } = get();
        if (!gameId) return false;
        const result = await api.selectStartingRegion(gameId, teamId, regionId);
        await get().refreshGame();
        return result.success;
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

      setComebackAssist: async (enabled) => {
        const { gameId } = get();
        if (!gameId) return;
        await api.setComebackAssist(gameId, enabled);
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
        if (!gameId) return { started: false, retryAt: null };
        const result = await api.startChallenge(gameId, regionId, teamId);
        if (!result.success || !result.question) {
          return { started: false, retryAt: result.retryAt ?? null };
        }
        set({
          activeChallenge: {
            regionId,
            teamId,
            question: result.question,
            isBettingZone: result.bettingZone ?? false,
          },
        });
        return { started: true, retryAt: null };
      },

      submitChallengeAnswer: async (selectedAnswer) => {
        const { gameId, activeChallenge } = get();
        if (!gameId || !activeChallenge) {
          return {
            correct: false,
            pointsAwarded: 0,
            bonusApplied: false,
            bettingZone: false,
            pointsLost: 0,
            retryAt: null,
          };
        }
        const result = await api.submitCapture(
          gameId,
          activeChallenge.regionId,
          activeChallenge.teamId,
          activeChallenge.question.id,
          selectedAnswer
        );
        set({ activeChallenge: null });
        await get().refreshGame();
        return {
          correct: result.correct ?? false,
          pointsAwarded: result.pointsAwarded ?? 0,
          bonusApplied: result.bonusApplied ?? false,
          bettingZone: result.bettingZone ?? false,
          pointsLost: result.pointsLost ?? 0,
          retryAt: result.retryAt ?? null,
        };
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

// 와이파이가 끊기면 즉시 "재연결 중" 상태로 전환하고, 다시 붙으면 채널을 새로
// 구독해 전체 상태를 재조회한다 (오프라인 동안 놓친 변경사항까지 복구).
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    useGameStore.setState({ connectionStatus: "disconnected", isConnected: false });
  });
  window.addEventListener("online", () => {
    useGameStore.getState().reconnect();
  });
}

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __gameStore?: typeof useGameStore }).__gameStore = useGameStore;
}
