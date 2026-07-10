"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchGameHistory } from "@/lib/supabase/queries";
import type { GameHistoryEntry } from "@/lib/supabase/types";
import { TeacherAuthGate } from "@/components/teacher/TeacherAuthGate";

const CLASS_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function TeacherHistoryPage() {
  return (
    <TeacherAuthGate>
      <HistoryDashboard />
    </TeacherAuthGate>
  );
}

function HistoryDashboard() {
  const [classNumber, setClassNumber] = useState<number>(1);
  const [entries, setEntries] = useState<GameHistoryEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // 선택된 반이 바뀔 때마다 서버에서 다시 조회하는 동기화 로직이다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(false);
    fetchGameHistory(classNumber)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [classNumber]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">반별 게임 결과</h1>
          <p className="text-sm text-neutral-400">반을 선택해 지난 게임들의 최종 순위를 확인하세요.</p>
        </div>
        <Link href="/teacher" className="text-sm text-blue-400 hover:underline">
          교사 대시보드로
        </Link>
      </header>

      <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
        반 선택
        <select
          value={classNumber}
          onChange={(e) => setClassNumber(Number(e.target.value))}
          className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
        >
          {CLASS_NUMBERS.map((n) => (
            <option key={n} value={n}>
              {n}반
            </option>
          ))}
        </select>
      </label>

      {isLoading && <p className="text-sm text-neutral-500">불러오는 중...</p>}

      {!isLoading && error && (
        <p className="rounded-lg border border-red-900/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          결과를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
        </p>
      )}

      {!isLoading && !error && entries !== null && entries.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
          {classNumber}반의 종료된 게임 기록이 없습니다.
        </p>
      )}

      {!isLoading && !error && entries !== null && entries.length > 0 && (
        <ul className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-neutral-500">{entry.code}</span>
                <span className="text-xs text-neutral-500">
                  {entry.endedAt
                    ? new Date(entry.endedAt).toLocaleString("ko-KR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : ""}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {entry.teams.map((team, i) => (
                  <li key={team.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 text-neutral-500">{i + 1}위</span>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="flex-1 font-medium text-white">{team.name}</span>
                    <span className="text-neutral-400">{team.score}점</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
