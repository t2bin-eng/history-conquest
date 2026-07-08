import { supabase } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

const WATCHED_TABLES: { table: string; filter: (gameId: string) => string }[] = [
  { table: "games", filter: (gameId) => `id=eq.${gameId}` },
  { table: "teams", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "team_members", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "regions", filter: (gameId) => `game_id=eq.${gameId}` },
  { table: "event_logs", filter: (gameId) => `game_id=eq.${gameId}` },
];

/** 게임에 속한 games/teams/team_members/regions/event_logs 변경을 모두 구독하고,
 * 변경이 있을 때마다 onChange를 호출한다. 상태 병합 대신 전체 재조회(fetchFullGame)로
 * 단순하고 견고하게 동기화한다 (학급 단위 소규모 트래픽에 적합).
 *
 * 테이블마다 별도 채널을 사용한다: 하나의 채널에 여러 테이블의
 * postgres_changes 바인딩을 체이닝하면 이벤트가 전달되지 않는 문제가
 * 실기기 테스트에서 확인되어, 테이블당 채널을 분리해 안정적으로 동작하게 했다. */
export function subscribeToGame(gameId: string, onChange: () => void): RealtimeChannel[] {
  return WATCHED_TABLES.map(({ table, filter }) =>
    supabase
      .channel(`game-${gameId}-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: filter(gameId) },
        onChange
      )
      .subscribe()
  );
}

export function unsubscribeFromGame(channels: RealtimeChannel[]): void {
  channels.forEach((channel) => supabase.removeChannel(channel));
}
