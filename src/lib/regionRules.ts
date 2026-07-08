import type { Region } from "@/types/game";

/**
 * 클라이언트 측 사전 확인용(도전 가능 지역 하이라이트 등). 실제 판정은
 * Supabase의 start_challenge/submit_capture RPC가 서버에서 원자적으로 재검증한다.
 */
export function canChallengeRegion(region: Region, teamId: string, now: Date = new Date()): boolean {
  if (region.ownerTeamId === teamId) return false;

  if (region.status === "OWNED") {
    if (region.cooldownUntil && now.getTime() < new Date(region.cooldownUntil).getTime()) {
      return false;
    }
    return true;
  }

  return !region.failedTeamIds.includes(teamId);
}
