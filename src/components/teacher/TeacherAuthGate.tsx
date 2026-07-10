"use client";

import { useEffect, useState } from "react";

// 별도 계정 시스템 없이 교사만 공유하는 단일 암호로 접근을 제한한다 — 학생이
// 실수로/장난으로 교사 대시보드에 들어오는 것을 막기 위한 용도이지, 강력한
// 보안이 필요한 값을 다루지는 않는다.
const TEACHER_PASSWORD = "qlfyd8park!";
const STORAGE_KEY = "history-conquest-teacher-auth";

export function TeacherAuthGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    // localStorage(외부 시스템)를 마운트 시 1회 읽어오는 동기화 로직이다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocked(window.localStorage.getItem(STORAGE_KEY) === "1");
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!unlocked) {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (input === TEACHER_PASSWORD) {
        window.localStorage.setItem(STORAGE_KEY, "1");
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
      }
    };

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-bold text-white">교사 대시보드</h1>
        <p className="text-sm text-neutral-400">암호를 입력해주세요.</p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(false);
            }}
            className="w-56 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-center text-white focus:border-blue-500 focus:outline-none"
          />
          {error && <p className="text-sm text-red-400">암호가 일치하지 않습니다.</p>}
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            입장하기
          </button>
        </form>
      </main>
    );
  }

  return <>{children}</>;
}
