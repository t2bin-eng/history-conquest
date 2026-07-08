import { supabase } from "./client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/** 게임에 속한 games/teams/team_members/regions/event_logs 변경을 모두 구독하고,
 * 변경이 있을 때마다 onChange를 호출한다. 상태 병합 대신 전체 재조회(fetchFullGame)로
 * 단순하고 견고하게 동기화한다 (학급 단위 소규모 트래픽에 적합). */
export function subscribeToGame(gameId: string, onChange: () => void): RealtimeChannel {
  const channel = supabase
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "team_members", filter: `game_id=eq.${gameId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "regions", filter: `game_id=eq.${gameId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "event_logs", filter: `game_id=eq.${gameId}` },
      onChange
    )
    .subscribe();

  return channel;
}

export function unsubscribeFromGame(channel: RealtimeChannel): void {
  supabase.removeChannel(channel);
}
