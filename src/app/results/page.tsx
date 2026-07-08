"use client";

import { useGameStore } from "@/store/gameStore";

export default function ResultsPage() {
  const teams = useGameStore((s) => s.game.teams);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-bold text-white">결과 화면 (구현 예정)</h1>
      <p className="text-sm text-neutral-400">
        게임이 종료되었습니다. 순위·포디움·축하 연출은 다음 단계에서 구현합니다.
      </p>
      <ul className="mt-2 text-sm text-neutral-300">
        {[...teams]
          .sort((a, b) => b.score - a.score)
          .map((t, i) => (
            <li key={t.id}>
              {i + 1}위 {t.name} — {t.score}점
            </li>
          ))}
      </ul>
    </main>
  );
}
