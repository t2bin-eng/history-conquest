import { supabase } from "./client";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

const WATCHED_TABLES: { table: string; filter: (gameId: string) => string }[] = [
  { table: "games", filter: (gameId) => `id=eq.${gameId}` },
  { table: "teams", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "team_members", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "regions", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "event_logs", filter: (gameId) => `game_id=eq.${gameId}` },
];

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type TableChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
export type TableChangeHandler = (table: string, payload: TableChangePayload) => void;

/** 게임에 속한 games/teams/team_members/regions/event_logs 변경을 모두 구독하고,
 * 변경이 있을 때마다 어떤 테이블에서 어떤 row가 바뀌었는지 onChange로 전달한다.
 * 호출부(gameStore)는 이 payload를 클라이언트에 보관 중인 raw 캐시에 반영해
 * 화면 상태를 다시 계산한다 — 변경 1건마다 서버에 전체 재조회를 요청하지
 * 않는다. 전체 재조회는 최초 접속/재접속 시, 그리고 Realtime이 놓친 변경을
 * 보정하는 주기적 폴백 폴링에서만 일어난다(gameStore 참고).
 *
 * 테이블마다 별도 채널을 사용한다: 하나의 채널에 여러 테이블의
 * postgres_changes 바인딩을 체이닝하면 이벤트가 전달되지 않는 문제가
 * 실기기 테스트에서 확인되어, 테이블당 채널을 분리해 안정적으로 동작하게 했다.
 *
 * onStatusChange는 채널 중 하나라도 끊기면 "reconnecting", 전부 연결되면
 * "connected"를 보고한다 — 와이파이가 끊겼을 때 학생 화면이 멈춘 것처럼 보이지
 * 않도록 배너로 안내하기 위함이다. */
export function subscribeToGame(
  gameId: string,
  onChange: TableChangeHandler,
  onStatusChange?: (status: ConnectionStatus) => void
): RealtimeChannel[] {
  const statuses = new Map<string, ConnectionStatus>();

  const reportStatus = () => {
    if (!onStatusChange) return;
    const values = Array.from(statuses.values());
    if (values.every((s) => s === "connected")) onStatusChange("connected");
    else if (values.some((s) => s === "disconnected")) onStatusChange("disconnected");
    else onStatusChange("reconnecting");
  };

  return WATCHED_TABLES.map(({ table, filter }) => {
    statuses.set(table, "reconnecting");
    return supabase
      .channel(`game-${gameId}-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: filter(gameId) },
        (payload) => onChange(table, payload)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") statuses.set(table, "connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          statuses.set(table, "disconnected");
        } else {
          statuses.set(table, "reconnecting");
        }
        reportStatus();
      });
  });
}

export function unsubscribeFromGame(channels: RealtimeChannel[]): void {
  channels.forEach((channel) => supabase.removeChannel(channel));
}
