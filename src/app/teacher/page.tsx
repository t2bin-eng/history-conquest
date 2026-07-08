"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { TeacherWaitingRoom } from "@/components/teacher/TeacherWaitingRoom";
import { TeacherLiveConsole } from "@/components/teacher/TeacherLiveConsole";

export default function TeacherPage() {
  const router = useRouter();
  const { gameId, game, isLoading, createNewGame } = useGameStore();
  const status = game.status;

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (gameId && status === "ENDED") {
      router.push("/results");
    }
  }, [gameId, status, router]);

  if (!gameId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-white">교사 대시보드</h1>
        <p className="text-sm text-neutral-400">새 게임을 만들어 학생들에게 참가 코드를 공유하세요.</p>
        <button
          type="button"
          disabled={isCreating}
          onClick={async () => {
            setIsCreating(true);
            try {
              await createNewGame(20 * 60);
            } finally {
              setIsCreating(false);
            }
          }}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800"
        >
          {isCreating ? "생성 중..." : "새 게임 만들기"}
        </button>
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
