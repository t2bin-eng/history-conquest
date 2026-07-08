"use client";

import { useGameStore } from "@/store/gameStore";

export function TeacherWaitingRoom() {
  const { game, setTimeLimitSec, startGame } = useGameStore();
  const { teams } = game;

  const readyCount = teams.filter((t) => t.isReady).length;
  const allReady = teams.length > 0 && readyCount === teams.length;
  const disabledReason =
    teams.length === 0 ? "참가 팀이 없습니다" : `${teams.length - readyCount}팀 준비 중`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white">교사 대시보드 — 대기실</h1>
        <p className="text-sm text-neutral-400">
          참가 팀 현황을 확인하고 제한시간을 설정한 뒤 퀴즈를 시작하세요.
        </p>
      </header>

      <section className="flex items-center gap-3 rounded-lg border border-neutral-800 px-4 py-3">
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
          전체 제한시간(분)
          <input
            type="number"
            min={1}
            value={Math.round(game.timeLimitSec / 60)}
            onChange={(e) => setTimeLimitSec(Math.max(1, Number(e.target.value) || 1) * 60)}
            className="w-20 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-white focus:border-blue-500 focus:outline-none"
          />
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-neutral-300">
          참가 팀 ({readyCount}/{teams.length}팀 준비 완료)
        </p>

        {teams.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-800 px-4 py-8 text-center text-sm text-neutral-500">
            아직 참가한 팀이 없습니다.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-950 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border-2"
                    style={{ backgroundColor: team.color, borderColor: team.color }}
                  >
                    {team.flagImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.flagImageUrl}
                        alt={`${team.name} 깃발`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-white/70">깃발</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{team.name}</p>
                    <span
                      className={`text-xs font-medium ${
                        team.isReady ? "text-green-400" : "text-neutral-500"
                      }`}
                    >
                      {team.isReady ? "준비완료" : "대기중"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {team.members.length === 0 ? (
                    <span className="text-xs text-neutral-600">팀원 미등록</span>
                  ) : (
                    team.members.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-neutral-300"
                      >
                        {m.name}
                      </span>
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="self-end" title={allReady ? undefined : disabledReason}>
        <button
          type="button"
          disabled={!allReady}
          onClick={startGame}
          className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
        >
          퀴즈 시작
        </button>
      </div>
    </div>
  );
}
