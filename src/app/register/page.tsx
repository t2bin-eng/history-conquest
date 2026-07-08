"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore, isColorTaken } from "@/store/gameStore";
import { TEAM_COLOR_PRESETS } from "@/data/teamPalette";
import { ColorPicker } from "@/components/team/ColorPicker";
import { MemberList } from "@/components/team/MemberList";
import { FlagUploader } from "@/components/team/FlagUploader";
import type { Team } from "@/types/game";

function firstAvailableColor(teams: Team[]) {
  const preset = TEAM_COLOR_PRESETS.find((p) => !isColorTaken(teams, p.value));
  return preset?.value ?? TEAM_COLOR_PRESETS[0].value;
}

export default function RegisterPage() {
  const router = useRouter();
  const { game, myTeamId, registerTeam, addMember, removeMember, setTeamColor, setTeamFlag } =
    useGameStore();

  const [teamName, setTeamName] = useState("");
  const myTeam = game.teams.find((t) => t.id === myTeamId) ?? null;

  const handleCreateTeam = () => {
    const trimmed = teamName.trim();
    if (!trimmed) return;
    registerTeam(trimmed, firstAvailableColor(game.teams));
  };

  const canProceed =
    !!myTeam && myTeam.members.length > 0 && !isColorTaken(game.teams, myTeam.color, myTeam.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-white">팀 등록</h1>
        <p className="text-sm text-neutral-400">
          팀 이름과 팀원, 색상, 깃발을 정하고 대기실로 입장하세요.
        </p>
      </header>

      {!myTeam ? (
        <section className="flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-300">
            팀 이름
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
              placeholder="예: 청룡팀"
              className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-500 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          </label>
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={!teamName.trim()}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            팀 만들기
          </button>
        </section>
      ) : (
        <>
          <section className="flex items-center justify-between rounded-lg bg-neutral-900 px-4 py-3">
            <div>
              <p className="text-xs text-neutral-500">등록된 팀</p>
              <p className="text-lg font-bold" style={{ color: myTeam.color }}>
                {myTeam.name}
              </p>
            </div>
            <div
              className="h-10 w-10 rounded-full border-2 border-neutral-700"
              style={{ backgroundColor: myTeam.color }}
            />
          </section>

          <MemberList
            members={myTeam.members}
            onAdd={(name) => addMember(myTeam.id, name)}
            onRemove={(memberId) => removeMember(myTeam.id, memberId)}
          />

          <ColorPicker
            teams={game.teams}
            myTeamId={myTeam.id}
            value={myTeam.color}
            onChange={(color) => setTeamColor(myTeam.id, color)}
          />

          <FlagUploader
            teamColor={myTeam.color}
            flagImageUrl={myTeam.flagImageUrl}
            onFlagConfirmed={(dataUrl) => setTeamFlag(myTeam.id, dataUrl)}
          />

          <button
            type="button"
            disabled={!canProceed}
            onClick={() => router.push("/lobby")}
            className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            대기실로 이동
          </button>
          {!canProceed && (
            <p className="-mt-4 text-xs text-neutral-500">
              팀원을 1명 이상 추가하고, 색상 중복을 해결해야 이동할 수 있어요.
            </p>
          )}
        </>
      )}
    </main>
  );
}
