"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinGameByCode = useGameStore((s) => s.joinGameByCode);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const autoJoinedRef = useRef(false);

  const handleJoin = async (codeToJoin?: string) => {
    const trimmed = (codeToJoin ?? code).trim();
    if (!trimmed) return;
    setIsJoining(true);
    setError(null);
    try {
      const ok = await joinGameByCode(trimmed);
      if (ok) {
        router.push("/register");
      } else {
        setError("게임 코드를 찾을 수 없습니다. 코드를 다시 확인해주세요.");
      }
    } catch {
      setError("접속 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsJoining(false);
    }
  };

  // QR코드로 들어온 경우(?code=XXXXXX) 자동으로 입력 + 참가 시도
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (!codeFromUrl || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    const normalized = codeFromUrl.trim().toUpperCase();
    setCode(normalized);
    handleJoin(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-white">게임 코드 입력</h1>
        <p className="mt-1 text-sm text-neutral-400">
          선생님이 안내한 6자리 게임 코드를 입력하세요.
        </p>
      </div>

      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        placeholder="ABC123"
        maxLength={6}
        autoFocus
        className="w-48 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-3 text-center font-mono text-2xl tracking-widest text-white placeholder:text-neutral-600 focus:border-blue-500 focus:outline-none"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={() => handleJoin()}
        disabled={!code.trim() || isJoining}
        className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {isJoining ? "접속 중..." : "참가하기"}
      </button>
    </main>
  );
}
