import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Game, Team } from "@/types/game";
import type {
  EventLogRow,
  GameRow,
  RegionRow,
  RpcQuestion,
  TeamMemberRow,
  TeamRow,
} from "@/lib/supabase/types";
import * as api from "@/lib/supabase/queries";
import type { RawGameState } from "@/lib/supabase/queries";
import {
  subscribeToGame,
  unsubscribeFromGame,
  type ConnectionStatus,
  type TableChangePayload,
} from "@/lib/supabase/realtime";

function upsertById<T extends { id: string }>(rows: T[], row: T): T[] {
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx === -1) return [...rows, row];
  const next = rows.slice();
  next[idx] = row;
  return next;
}

function removeById<T extends { id: string }>(rows: T[], id: string): T[] {
  return rows.filter((r) => r.id !== id);
}

// 실시간 화면에서는 최근 이벤트 피드만 필요하므로, fetchGameRaw의 초기 조회와
// 동일한 상한으로 클라이언트 쪽 캐시도 계속 잘라낸다(결과 화면의 전체 통계는
// fetchEventLogs로 별도 조회하므로 여기서 잘려도 무방하다).
const LIVE_EVENT_LOG_CAP = 300;

/** 실시간 postgres_changes 이벤트 1건을 raw 캐시에 반영해 새 raw 상태를
 * 만든다. 서버에 재조회를 요청하지 않고 클라이언트에서 바로 계산하므로,
 * 하나의 액션이 여러 테이블(예: submit_capture가 regions+teams+event_logs를
 * 동시에 바꾸는 경우)을 건드려도 접속 중인 각 클라이언트는 테이블당 1번씩
 * 가벼운 로컬 병합만 하면 된다. */
function applyRealtimeChange(
  raw: RawGameState,
  table: string,
  payload: TableChangePayload
): RawGameState {
  const isDelete = payload.eventType === "DELETE";

  switch (table) {
    case "games": {
      if (isDelete) return raw;
      return { ...raw, gameRow: payload.new as unknown as GameRow };
    }
    case "teams": {
      if (isDelete) {
        const old = payload.old as unknown as TeamRow;
        return { ...raw, teamRows: removeById(raw.teamRows, old.id) };
      }
      return { ...raw, teamRows: upsertById(raw.teamRows, payload.new as unknown as TeamRow) };
    }
    case "team_members": {
      if (isDelete) {
        const old = payload.old as unknown as TeamMemberRow;
        return { ...raw, memberRows: removeById(raw.memberRows, old.id) };
      }
      return {
        ...raw,
        memberRows: upsertById(raw.memberRows, payload.new as unknown as TeamMemberRow),
      };
    }
    case "regions": {
      if (isDelete) {
        const old = payload.old as unknown as RegionRow;
        return { ...raw, regionRows: removeById(raw.regionRows, old.id) };
      }
      return {
        ...raw,
        regionRows: upsertById(raw.regionRows, payload.new as unknown as RegionRow),
      };
    }
    case "event_logs": {
      if (isDelete) {
        const old = payload.old as unknown as EventLogRow;
        return { ...raw, logRows: removeById(raw.logRows, old.id) };
      }
      let logRows = upsertById(raw.logRows, payload.new as unknown as EventLogRow);
      if (logRows.length > LIVE_EVENT_LOG_CAP) {
        logRows = logRows
          .slice()
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .slice(-LIVE_EVENT_LOG_CAP);
      }
      return { ...raw, logRows };
    }
    default:
      return raw;
  }
}

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
  _raw: RawGameState | null;

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

  startChallenge: (regionId: string, teamId: string) => Promise<boolean>;
  submitChallengeAnswer: (selectedAnswer: string) => Promise<{
    correct: boolean;
    pointsAwarded: number;
    bonusApplied: boolean;
    bettingZone: boolean;
    pointsLost: number;
  }>;
  cancelChallenge: () => void;
}

// 모바일에서 화면이 꺼지거나 백그라운드로 전환되면 Realtime 소켓이 겉으로는
// "연결됨" 상태를 유지한 채 조용히 업데이트를 놓치는 경우가 있다 (특히 교사가
// 게임을 강제 종료했는데 학생 화면이 넘어가지 않는 문제로 나타남). Realtime을
// 믿기만 하지 않고, 주기적으로 게임 상태를 직접 다시 받아와 그 간극을 메운다.
// 이제 실시간 변경은 로컬 병합으로 처리되어 이 폴링이 유일한 전체 재조회
// 경로이므로, 매 tick마다 접속 중인 모든 클라이언트가 서버에 전체 조회를
// 요청한다는 점을 감안해 너무 잦지 않게(20초) 유지한다 — 그래도 걸리는
// 간극은 이 폴백이 곧 메운다.
const POLL_INTERVAL_MS = 20000;

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
  const raw = await api.fetchGameRaw(gameId);
  const channel = subscribeToGame(
    gameId,
    (table, payload) => {
      // 변경 1건마다 서버에 재조회하지 않고, 로컬 raw 캐시에 반영한 뒤
      // 클라이언트에서 즉시 다시 계산한다(네트워크 왕복 없음).
      const current = get()._raw;
      if (!current) return;
      const nextRaw = applyRealtimeChange(current, table, payload);
      set({ _raw: nextRaw, game: api.composeGame(nextRaw) });
    },
    (status) => set({ connectionStatus: status, isConnected: status === "connected" })
  );
  const pollInterval = setInterval(() => {
    get().refreshGame();
  }, POLL_INTERVAL_MS);
  set({
    game: api.composeGame(raw),
    _raw: raw,
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
      _raw: null,

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
          _raw: null,
        });
      },

      refreshGame: async () => {
        const { gameId } = get();
        if (!gameId) return;
        const raw = await api.fetchGameRaw(gameId);
        set({ game: api.composeGame(raw), _raw: raw });
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
        if (!gameId) return false;
        const result = await api.startChallenge(gameId, regionId, teamId);
        if (!result.success || !result.question) return false;
        set({
          activeChallenge: {
            regionId,
            teamId,
            question: result.question,
            isBettingZone: result.bettingZone ?? false,
          },
        });
        return true;
      },

      submitChallengeAnswer: async (selectedAnswer) => {
        const { gameId, activeChallenge } = get();
        if (!gameId || !activeChallenge) {
          return { correct: false, pointsAwarded: 0, bonusApplied: false, bettingZone: false, pointsLost: 0 };
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
