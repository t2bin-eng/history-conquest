import type { Region, Team } from "@/types/game";

const RECONQUEST_COOLDOWN_MS = 60_000;

export function reconquestCooldownUntil(from: Date = new Date()) {
  return new Date(from.getTime() + RECONQUEST_COOLDOWN_MS).toISOString();
}

/** 지시서 4.1-C: 지역 클릭 시 도전 가능 여부(자기 소유/쿨다운/오답 이력) 판정 */
export function canChallengeRegion(region: Region, teamId: string, now: Date = new Date()): boolean {
  if (region.ownerTeamId === teamId) return false;

  if (region.status === "OWNED") {
    if (region.cooldownUntil && now.getTime() < new Date(region.cooldownUntil).getTime()) {
      return false;
    }
    return true;
  }

  // NEUTRAL: 지시서 5.2 오답 재응시 제한
  return !region.failedTeamIds.includes(teamId);
}

export function syncTeamOwnedRegions(teams: Team[], regions: Region[]): Team[] {
  return teams.map((team) => ({
    ...team,
    ownedRegionIds: regions.filter((r) => r.ownerTeamId === team.id).map((r) => r.id),
  }));
}

interface SurroundResult {
  regions: Region[];
  captures: { regionId: string; teamId: string }[];
}

/** 지시서 5.1: 지역의 모든 인접 지역이 한 팀 소유가 되면 자동 편입 (연쇄 편입 포함) */
export function applySurroundCaptures(regions: Region[]): SurroundResult {
  let current = regions;
  const captures: SurroundResult["captures"] = [];
  let changed = true;

  while (changed) {
    changed = false;
    const byId = new Map(current.map((r) => [r.id, r]));

    for (const region of current) {
      if (region.adjacentRegionIds.length === 0) continue;

      const neighborOwners = region.adjacentRegionIds.map((id) => byId.get(id)?.ownerTeamId ?? null);
      if (neighborOwners.some((owner) => owner === null)) continue;

      const uniqueOwners = new Set(neighborOwners as string[]);
      if (uniqueOwners.size !== 1) continue;

      const [surroundingTeamId] = uniqueOwners;
      if (region.ownerTeamId === surroundingTeamId) continue;

      current = current.map((r) =>
        r.id === region.id
          ? {
              ...r,
              ownerTeamId: surroundingTeamId,
              status: "OWNED" as const,
              cooldownUntil: null,
              failedTeamIds: [],
            }
          : r
      );
      captures.push({ regionId: region.id, teamId: surroundingTeamId });
      changed = true;
    }
  }

  return { regions: current, captures };
}
