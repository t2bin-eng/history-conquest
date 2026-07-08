"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { TeacherWaitingRoom } from "@/components/teacher/TeacherWaitingRoom";
import { TeacherLiveConsole } from "@/components/teacher/TeacherLiveConsole";

export default function TeacherPage() {
  const router = useRouter();
  const status = useGameStore((s) => s.game.status);

  useEffect(() => {
    if (status === "ENDED") {
      router.push("/results");
    }
  }, [status, router]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      {status === "WAITING" ? <TeacherWaitingRoom /> : <TeacherLiveConsole />}
    </main>
  );
}
