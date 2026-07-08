"use client";

import { useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { RegionMap } from "@/components/map/RegionMap";
import { MOCK_MAP_VIEWBOX } from "@/data/mockRegions";
import { difficultyLabel } from "@/lib/regionDisplay";

export default function LobbyPage() {
  const { game, gameId, isLoading, myTeamId, setStartingRegion, setReady } = useGameStore();
  const myTeam = game.teams.find((t) => t.id === myTeamId) ?? null;
  const [previewRegionId, setPreviewRegionId] = useState<string | null>(null);

  if (!gameId) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-neutral-400">먼저 게임 코드를 입력해 참가해주세요.</p>
        <Link href="/join" className="text-sm font-medium text-blue-400 hover:underline">
          게임 코드 입력하러 가기
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

  const takenStartingRegionIds = game.teams
    .filter((t) => t.id !== myTeam.id && t.startingRegionId)
    .map((t) => t.startingRegionId as string);

  const selectableRegionIds = game.regions
    .filter((r) => r.status === "NEUTRAL" && !takenStartingRegionIds.includes(r.id))
    .map((r) => r.id);

  const previewRegion = previewRegionId
    ? game.regions.find((r) => r.id === previewRegionId)
    : null;

  const handleRegionClick = (regionId: string) => {
    if (myTeam.isReady) return;
    if (!selectableRegionIds.includes(regionId)) return;
    setPreviewRegionId(regionId);
  };

  const handleConfirmStart = () => {
    if (!previewRegionId) return;
    setStartingRegion(myTeam.id, previewRegionId);
  };

  const readyCount = game.teams.filter((t) => t.isReady).length;
  const waitingCount = game.teams.length - readyCount;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">시작 지역 선택</h1>
          <p className="text-sm text-neutral-400">
            지도를 눌러 우리 팀의 시작 지역을 정하세요.
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1.5 text-sm font-semibold"
          style={{ backgroundColor: myTeam.color, color: "#0a0a0a" }}
        >
          {myTeam.name}
        </div>
      </header>

      <section className="aspect-[5/4] w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2">
        <RegionMap
          regions={game.regions}
          teams={game.teams}
          viewBoxWidth={MOCK_MAP_VIEWBOX.width}
          viewBoxHeight={MOCK_MAP_VIEWBOX.height}
          onRegionClick={handleRegionClick}
          selectedRegionId={myTeam.startingRegionId ?? previewRegionId}
          selectableRegionIds={myTeam.isReady ? [] : selectableRegionIds}
          interactive={!myTeam.isReady}
        />
      </section>

      {previewRegion && !myTeam.startingRegionId && (
        <section className="flex items-center justify-between rounded-lg bg-neutral-900 px-4 py-3">
          <div>
            <p className="font-semibold text-white">{previewRegion.name}</p>
            <p className="text-xs text-neutral-400">
              난이도 {difficultyLabel(previewRegion.difficulty)} · {previewRegion.points}점
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirmStart}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            이 지역에서 시작하기
          </button>
        </section>
      )}

      {myTeam.startingRegionId && (
        <section className="flex items-center justify-between rounded-lg bg-neutral-900 px-4 py-3">
          <div>
            <p className="text-xs text-neutral-500">선택한 시작 지역</p>
            <p className="font-semibold text-white">
              {game.regions.find((r) => r.id === myTeam.startingRegionId)?.name}
            </p>
          </div>
          {!myTeam.isReady && (
            <button
              type="button"
              onClick={() => {
                setStartingRegion(myTeam.id, null);
                setPreviewRegionId(null);
              }}
              className="text-xs text-neutral-500 hover:text-red-400"
            >
              다시 선택
            </button>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-neutral-800 px-4 py-3">
        <p className="text-sm font-medium text-neutral-300">
          팀 준비 현황 ({readyCount}/{game.teams.length}팀 완료, 대기중 {waitingCount}팀)
        </p>
        <ul className="flex flex-wrap gap-2">
          {game.teams.map((team) => (
            <li
              key={team.id}
              className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <span className="text-neutral-200">{team.name}</span>
              <span className={team.isReady ? "text-green-400" : "text-neutral-500"}>
                {team.isReady ? "준비완료" : "대기중"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        disabled={!myTeam.startingRegionId}
        onClick={() => setReady(myTeam.id, !myTeam.isReady)}
        className={`rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500 ${
          myTeam.isReady ? "bg-neutral-700 hover:bg-neutral-600" : "bg-green-600 hover:bg-green-500"
        }`}
      >
        {myTeam.isReady ? "준비 완료 취소" : "준비 완료"}
      </button>
    </main>
  );
}
