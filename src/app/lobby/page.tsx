"use client";

import { useGameStore } from "@/store/gameStore";

export default function LobbyPage() {
  const myTeam = useGameStore((s) => s.game.teams.find((t) => t.id === s.myTeamId));

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold text-white">대기실 (구현 예정)</h1>
      {myTeam && (
        <p className="text-sm text-neutral-400">
          <span style={{ color: myTeam.color }}>{myTeam.name}</span> 팀으로 등록되었습니다.
          다음 단계에서 시작 지역 선택과 준비 완료 기능을 구현합니다.
        </p>
      )}
    </main>
  );
}
