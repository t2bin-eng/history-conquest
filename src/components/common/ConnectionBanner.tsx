"use client";

import { useGameStore } from "@/store/gameStore";

/** Realtime 연결이 끊겼을 때 화면 상단에 안내 배너를 띄운다.
 * 게임에 참여 중이 아닐 때(gameId 없음)는 표시하지 않는다. */
export function ConnectionBanner() {
  const { gameId, connectionStatus } = useGameStore();

  if (!gameId || connectionStatus === "connected") return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-yellow-500/90 px-3 py-1.5 text-xs font-semibold text-black"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
      재연결 중입니다... 잠시만 기다려주세요. (새로고침하지 않아도 됩니다)
    </div>
  );
}
