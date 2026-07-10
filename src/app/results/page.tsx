"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import { useGameStore } from "@/store/gameStore";
import { RegionMap } from "@/components/map/RegionMap";
import { MOCK_MAP_VIEWBOX } from "@/data/mockRegions";
import { Podium } from "@/components/results/Podium";
import { computeTeamStats } from "@/lib/teamStats";
import { downloadResultsCsv } from "@/lib/exportResultsCsv";

export default function ResultsPage() {
  const router = useRouter();
  const { game, gameCode, leaveGame } = useGameStore();
  const { teams, regions, eventLogs } = game;

  const handleLeaveGame = () => {
    leaveGame();
    router.push("/");
  };

  const rankedTeams = [...teams].sort((a, b) => b.score - a.score);
  const maxOwned = Math.max(1, ...rankedTeams.map((t) => t.ownedRegionIds.length));

  useEffect(() => {
    if (rankedTeams.length === 0) return;
    const colors = rankedTeams.slice(0, 3).map((t) => t.color);
    const end = Date.now() + 1000;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (rankedTeams.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-neutral-400">아직 종료된 게임 결과가 없습니다.</p>
        <Link href="/" className="text-sm font-medium text-blue-400 hover:underline">
          홈으로 이동
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-white">게임 종료! 최종 결과</h1>
        <p className="mt-1 text-sm text-neutral-400">수고하셨습니다. 최종 순위를 확인하세요.</p>
      </header>

      <Podium rankedTeams={rankedTeams} />

      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-neutral-300">전체 순위</p>
        <ul className="flex flex-col gap-1.5">
          {rankedTeams.map((t, i) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-md bg-neutral-900 px-3 py-2 text-sm"
            >
              <span className="w-6 text-neutral-500">{i + 1}위</span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
              <span className="flex-1 font-medium text-white">{t.name}</span>
              <span className="text-neutral-400">{t.score}점</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="aspect-[5/4] rounded-lg border border-neutral-800 bg-neutral-950 p-2">
          <RegionMap
            regions={regions}
            teams={teams}
            viewBoxWidth={MOCK_MAP_VIEWBOX.width}
            viewBoxHeight={MOCK_MAP_VIEWBOX.height}
            viewBoxMinX={MOCK_MAP_VIEWBOX.minX}
            viewBoxMinY={MOCK_MAP_VIEWBOX.minY}
            interactive={false}
          />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-neutral-300">팀별 점유 지역 수</p>
          {rankedTeams.map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 truncate text-neutral-300">{t.name}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-900">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(t.ownedRegionIds.length / maxOwned) * 100}%`,
                    backgroundColor: t.color,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-neutral-500">
                {t.ownedRegionIds.length}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-x-auto">
        <p className="mb-2 text-sm font-semibold text-neutral-300">팀별 상세 전적</p>
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="text-xs text-neutral-500">
            <tr>
              <th className="pb-2 font-normal">팀</th>
              <th className="pb-2 font-normal">점수</th>
              <th className="pb-2 font-normal">점령 지역</th>
              <th className="pb-2 font-normal">정답</th>
              <th className="pb-2 font-normal">오답</th>
              <th className="pb-2 font-normal">탈환 성공</th>
            </tr>
          </thead>
          <tbody>
            {rankedTeams.map((t) => {
              const stats = computeTeamStats(t, eventLogs);
              return (
                <tr key={t.id} className="border-t border-neutral-900">
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5 text-white">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.name}
                    </span>
                  </td>
                  <td className="py-2 text-neutral-300">{t.score}점</td>
                  <td className="py-2 text-neutral-300">{t.ownedRegionIds.length}곳</td>
                  <td className="py-2 text-green-400">{stats.correctCount}</td>
                  <td className="py-2 text-red-400">{stats.wrongCount}</td>
                  <td className="py-2 text-neutral-300">{stats.reconquestCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => downloadResultsCsv(rankedTeams, eventLogs, gameCode)}
          className="rounded-md border border-neutral-700 px-6 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-900"
        >
          결과 CSV 다운로드
        </button>
        <button
          type="button"
          onClick={handleLeaveGame}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          처음으로 돌아가기
        </button>
      </div>
    </main>
  );
}
