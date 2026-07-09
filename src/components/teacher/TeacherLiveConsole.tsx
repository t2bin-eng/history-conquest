"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/store/gameStore";
import { RegionMap } from "@/components/map/RegionMap";
import { MiniMap } from "@/components/map/MiniMap";
import { MOCK_MAP_VIEWBOX } from "@/data/mockRegions";
import { difficultyLabel } from "@/lib/regionDisplay";
import { eventToMessage } from "@/lib/eventMessage";
import { formatMMSS } from "@/lib/time";
import { useRemainingSeconds } from "@/hooks/useRemainingSeconds";

export function TeacherLiveConsole() {
  const { game, pauseGame, resumeGame, endGame } = useGameStore();
  const remainingSec = useRemainingSeconds(game);

  const teamById = new Map(game.teams.map((t) => [t.id, t]));
  const rankedTeams = [...game.teams].sort((a, b) => b.score - a.score);

  const latestNews = [...game.eventLogs]
    .reverse()
    .find((e) => e.type === "CAPTURE" || e.type === "RECONQUEST" || e.type === "SURROUND");

  const recentLogs = [...game.eventLogs].reverse().slice(0, 30);

  const handleForceEnd = () => {
    if (window.confirm("정말로 게임을 강제 종료할까요? 되돌릴 수 없습니다.")) {
      endGame();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between rounded-lg border border-neutral-800 px-4 py-3">
        <h1 className="text-lg font-bold text-white">실시간 관제</h1>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl font-bold text-white">
            {formatMMSS(remainingSec)}
          </span>
          <button
            type="button"
            onClick={() => window.open("/display", "_blank", "noopener,noreferrer")}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            전광판 모드 열기
          </button>
          <button
            type="button"
            onClick={() => (game.isPaused ? resumeGame() : pauseGame())}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            {game.isPaused ? "재개" : "일시정지"}
          </button>
          <button
            type="button"
            onClick={handleForceEnd}
            className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
          >
            강제 종료
          </button>
        </div>
      </header>

      {game.isPaused && (
        <div className="rounded-md bg-yellow-500/10 px-3 py-1.5 text-center text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/30">
          일시정지됨 — 학생 화면의 지역 도전이 잠겨 있습니다.
        </div>
      )}

      {latestNews && (
        <div className="overflow-hidden rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
          {eventToMessage(latestNews, game.teams, game.regions)}
        </div>
      )}

      <ul className="flex flex-wrap gap-1.5">
        <AnimatePresence initial={false}>
          {rankedTeams.map((t, i) => (
            <motion.li
              key={t.id}
              layout
              className="flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300"
            >
              <span className="text-neutral-500">{i + 1}위</span>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.name} {t.score}점
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <section className="aspect-[5/4] rounded-lg border border-neutral-800 bg-neutral-950 p-2">
          <RegionMap
            regions={game.regions}
            teams={game.teams}
            viewBoxWidth={MOCK_MAP_VIEWBOX.width}
            viewBoxHeight={MOCK_MAP_VIEWBOX.height}
            interactive={false}
          />
        </section>

        <div className="flex flex-col gap-4">
          <MiniMap
            regions={game.regions}
            teams={game.teams}
            viewBoxWidth={MOCK_MAP_VIEWBOX.width}
            viewBoxHeight={MOCK_MAP_VIEWBOX.height}
            className="aspect-[5/4]"
          />

          <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 p-3">
            <p className="text-xs font-semibold text-neutral-400">지역 현황</p>
            <div className="max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-neutral-500">
                  <tr>
                    <th className="pb-1 font-normal">지역</th>
                    <th className="pb-1 font-normal">난이도</th>
                    <th className="pb-1 font-normal">소유팀</th>
                  </tr>
                </thead>
                <tbody>
                  {game.regions.map((r) => {
                    const owner = r.ownerTeamId ? teamById.get(r.ownerTeamId) : undefined;
                    return (
                      <tr key={r.id} className="border-t border-neutral-900">
                        <td className="py-1 text-neutral-200">{r.name}</td>
                        <td className="py-1 text-neutral-500">{difficultyLabel(r.difficulty)}</td>
                        <td className="py-1">
                          {owner ? (
                            <span style={{ color: owner.color }}>{owner.name}</span>
                          ) : (
                            <span className="text-neutral-600">무주공산</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 p-3">
        <p className="mb-2 text-xs font-semibold text-neutral-400">도전 이력 로그</p>
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-xs text-neutral-300">
          {recentLogs.length === 0 && <li className="text-neutral-600">아직 기록이 없습니다.</li>}
          {recentLogs.map((log) => (
            <li key={log.id} className="flex gap-2">
              <span className="shrink-0 text-neutral-600">
                {new Date(log.timestamp).toLocaleTimeString("ko-KR", { hour12: false })}
              </span>
              <span>{eventToMessage(log, game.teams, game.regions)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
