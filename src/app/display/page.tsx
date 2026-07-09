"use client";

import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { RegionMap } from "@/components/map/RegionMap";
import { MOCK_MAP_VIEWBOX } from "@/data/mockRegions";
import { eventToMessage } from "@/lib/eventMessage";
import { formatMMSS } from "@/lib/time";
import { useRemainingSeconds } from "@/hooks/useRemainingSeconds";

/** 프로젝터/TV용 전광판 화면. 조작 버튼 없이 지도와 순위만 크게 보여준다. */
export default function DisplayPage() {
  const { game, gameId, gameCode, isLoading } = useGameStore();
  const remainingSec = useRemainingSeconds(game);
  const rankedTeams = [...game.teams].sort((a, b) => b.score - a.score);

  const latestNews = [...game.eventLogs]
    .reverse()
    .find((e) => e.type === "CAPTURE" || e.type === "RECONQUEST" || e.type === "SURROUND");

  if (!gameId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-neutral-400">진행 중인 게임이 없습니다.</p>
        <Link href="/teacher" className="text-blue-400 hover:underline">
          교사 대시보드로 이동
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col gap-4 bg-black p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
          <h1 className="text-2xl font-bold text-white">역사 정복 — 실시간 현황</h1>
          {gameCode && (
            <span className="rounded-md bg-neutral-900 px-2.5 py-1 font-mono text-sm text-neutral-400">
              {gameCode}
            </span>
          )}
        </div>
        <span className="font-mono text-3xl font-bold text-white">{formatMMSS(remainingSec)}</span>
      </header>

      {latestNews && (
        <div className="rounded-md bg-neutral-900 px-4 py-2 text-center text-base text-neutral-200">
          {eventToMessage(latestNews, game.teams, game.regions)}
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
          <RegionMap
            regions={game.regions}
            teams={game.teams}
            viewBoxWidth={MOCK_MAP_VIEWBOX.width}
            viewBoxHeight={MOCK_MAP_VIEWBOX.height}
            interactive={false}
          />
        </section>

        <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 p-4">
          <p className="mb-1 text-sm font-semibold text-neutral-400">팀 순위</p>
          {rankedTeams.map((t, i) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-md bg-neutral-900 px-3 py-3"
            >
              <span className="w-6 text-lg font-bold text-neutral-500">{i + 1}</span>
              <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="flex-1 truncate text-lg font-semibold text-white">{t.name}</span>
              <span className="text-lg font-bold text-white">{t.score}점</span>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
