"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { RegionMap } from "@/components/map/RegionMap";
import { MiniMap } from "@/components/map/MiniMap";
import { QuizModal } from "@/components/quiz/QuizModal";
import { MOCK_MAP_VIEWBOX } from "@/data/mockRegions";
import { canChallengeRegion } from "@/lib/regionRules";
import { eventToMessage } from "@/lib/eventMessage";
import { formatMMSS } from "@/lib/time";
import { useRemainingSeconds } from "@/hooks/useRemainingSeconds";

export default function PlayPage() {
  const router = useRouter();
  const { game, myTeamId, activeChallenge, startChallenge, submitChallengeAnswer, endGame } =
    useGameStore();
  const myTeam = game.teams.find((t) => t.id === myTeamId) ?? null;

  const [toast, setToast] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; regionName: string; points: number } | null>(
    null
  );

  const remainingSec = useRemainingSeconds(game);
  const allCaptured = game.regions.length > 0 && game.regions.every((r) => r.ownerTeamId !== null);

  useEffect(() => {
    if (game.status === "PLAYING" && !game.isPaused && (remainingSec <= 0 || allCaptured)) {
      endGame();
    }
  }, [game.status, game.isPaused, remainingSec, allCaptured, endGame]);

  useEffect(() => {
    if (game.status === "ENDED") {
      router.push("/results");
    }
  }, [game.status, router]);

  if (!myTeam) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-neutral-400">등록된 팀 정보가 없습니다.</p>
        <Link href="/register" className="text-sm font-medium text-blue-400 hover:underline">
          팀 등록 화면으로 이동
        </Link>
      </main>
    );
  }

  if (game.status === "WAITING") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-neutral-400">아직 게임이 시작되지 않았습니다.</p>
        <Link href="/lobby" className="text-sm font-medium text-blue-400 hover:underline">
          대기실로 이동
        </Link>
      </main>
    );
  }

  const challengeableRegionIds = game.regions
    .filter((r) => canChallengeRegion(r, myTeam.id))
    .map((r) => r.id);

  const latestNews = [...game.eventLogs]
    .reverse()
    .find((e) => e.type === "CAPTURE" || e.type === "RECONQUEST" || e.type === "SURROUND");

  const handleRegionClick = (regionId: string) => {
    const started = startChallenge(regionId, myTeam.id);
    if (!started) {
      setToast("지금은 도전할 수 없는 지역입니다.");
      window.setTimeout(() => setToast(null), 2000);
    }
  };

  const handleAnswer = (choice: string) => {
    if (!activeChallenge) return;
    const region = game.regions.find((r) => r.id === activeChallenge.regionId);
    const correct = submitChallengeAnswer(choice);
    setFeedback({ correct, regionName: region?.name ?? "", points: region?.points ?? 0 });
    window.setTimeout(() => setFeedback(null), 1800);
  };

  const handleTimeUp = () => {
    if (!activeChallenge) return;
    const region = game.regions.find((r) => r.id === activeChallenge.regionId);
    submitChallengeAnswer("__TIMEOUT__");
    setFeedback({ correct: false, regionName: region?.name ?? "", points: 0 });
    window.setTimeout(() => setFeedback(null), 1800);
  };

  const rankedTeams = [...game.teams].sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-6">
      <header className="flex items-center justify-between rounded-lg border border-neutral-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: myTeam.color }}
          />
          <span className="font-semibold text-white">{myTeam.name}</span>
          <span className="text-sm text-neutral-400">{myTeam.score}점</span>
        </div>
        <div className="font-mono text-lg font-bold text-white">{formatMMSS(remainingSec)}</div>
      </header>

      {game.isPaused && (
        <div className="rounded-md bg-yellow-500/10 px-3 py-1.5 text-center text-xs font-semibold text-yellow-400 ring-1 ring-yellow-500/30">
          교사가 게임을 일시정지했습니다. 잠시만 기다려주세요.
        </div>
      )}

      {latestNews && (
        <div className="overflow-hidden rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
          {eventToMessage(latestNews, game.teams, game.regions)}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {rankedTeams.map((t, i) => (
          <span
            key={t.id}
            className="flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300"
          >
            <span className="text-neutral-500">{i + 1}위</span>
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
            {t.name} {t.score}점
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
        <section className="aspect-[5/4] rounded-lg border border-neutral-800 bg-neutral-950 p-2">
          <RegionMap
            regions={game.regions}
            teams={game.teams}
            viewBoxWidth={MOCK_MAP_VIEWBOX.width}
            viewBoxHeight={MOCK_MAP_VIEWBOX.height}
            onRegionClick={handleRegionClick}
            selectableRegionIds={challengeableRegionIds}
          />
        </section>
        <MiniMap
          regions={game.regions}
          teams={game.teams}
          viewBoxWidth={MOCK_MAP_VIEWBOX.width}
          viewBoxHeight={MOCK_MAP_VIEWBOX.height}
          className="hidden aspect-[5/4] md:block"
        />
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-neutral-800 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}

      {feedback && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-sm font-semibold shadow-lg ${
            feedback.correct ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {feedback.correct
            ? `${feedback.regionName} 정복! +${feedback.points}점`
            : `${feedback.regionName} 오답`}
        </div>
      )}

      {activeChallenge && activeChallenge.teamId === myTeam.id && (
        <QuizModal
          key={activeChallenge.question.id}
          question={activeChallenge.question}
          regionName={game.regions.find((r) => r.id === activeChallenge.regionId)?.name ?? ""}
          onAnswer={handleAnswer}
          onTimeUp={handleTimeUp}
        />
      )}
    </main>
  );
}
