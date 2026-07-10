"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { TeacherWaitingRoom } from "@/components/teacher/TeacherWaitingRoom";
import { TeacherLiveConsole } from "@/components/teacher/TeacherLiveConsole";
import { TeacherAuthGate } from "@/components/teacher/TeacherAuthGate";

const CLASS_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function TeacherPage() {
  return (
    <TeacherAuthGate>
      <TeacherDashboard />
    </TeacherAuthGate>
  );
}

function TeacherDashboard() {
  const router = useRouter();
  const { gameId, game, isLoading, createNewGame } = useGameStore();
  const status = game.status;

  const [isCreating, setIsCreating] = useState(false);
  const [classNumber, setClassNumber] = useState<number | null>(null);

  useEffect(() => {
    if (gameId && status === "ENDED") {
      router.push("/results");
    }
  }, [gameId, status, router]);

  if (!gameId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-white">교사 대시보드</h1>
        <p className="text-sm text-neutral-400">반을 선택하고 새 게임을 만들어 학생들에게 참가 코드를 공유하세요.</p>

        <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          반 선택
          <select
            value={classNumber ?? ""}
            onChange={(e) => setClassNumber(e.target.value ? Number(e.target.value) : null)}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">반 선택</option>
            {CLASS_NUMBERS.map((n) => (
              <option key={n} value={n}>
                {n}반
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={isCreating || classNumber === null}
          onClick={async () => {
            if (classNumber === null) return;
            setIsCreating(true);
            try {
              await createNewGame(20 * 60, classNumber);
            } finally {
              setIsCreating(false);
            }
          }}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800"
        >
          {isCreating ? "생성 중..." : "새 게임 만들기"}
        </button>

        <Link href="/teacher/history" className="text-sm text-blue-400 hover:underline">
          반별 지난 결과 보기
        </Link>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-neutral-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      {status === "WAITING" ? <TeacherWaitingRoom /> : <TeacherLiveConsole />}
    </main>
  );
}
