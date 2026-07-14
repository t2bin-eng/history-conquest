import type { EventLog, Team } from "@/types/game";
import { computeTeamStats } from "./teamStats";

export interface TeamRankInfo {
  teamId: string;
  compositeRank: number;
  landRank: number;
  accuracyRank: number;
}

/** 라플라스 스무딩을 적용한 정답률. 시도 횟수가 적을수록 50%에 가깝게
 * 당겨져서, 한두 문제만 맞힌 팀이 정답률 1위로 착시를 일으키는 것을 막는다.
 * 시도 횟수가 많아질수록 실제 정답률에 수렴한다. */
function smoothedAccuracy(team: Team, eventLogs: EventLog[]): number {
  const { correctCount, wrongCount } = computeTeamStats(team, eventLogs);
  return (correctCount + 1) / (correctCount + wrongCount + 2);
}

function rankByDesc(teams: Team[], valueOf: (t: Team) => number): Map<string, number> {
  const sorted = [...teams].sort((a, b) => valueOf(b) - valueOf(a));
  return new Map(sorted.map((t, i) => [t.id, i + 1]));
}

/** 종합 순위 = (땅 점수 순위 + 보정 정답률 순위)의 평균이 낮은(=좋은) 순.
 * 점수 대신 등수만 노출하기 위한 용도라, 원점수는 반환하지 않는다. */
export function computeCompositeRanks(teams: Team[], eventLogs: EventLog[]): TeamRankInfo[] {
  const landRankOf = rankByDesc(teams, (t) => t.score);
  const accuracyRankOf = rankByDesc(teams, (t) => smoothedAccuracy(t, eventLogs));

  const withComposite = teams.map((t) => {
    const landRank = landRankOf.get(t.id)!;
    const accuracyRank = accuracyRankOf.get(t.id)!;
    return { teamId: t.id, landRank, accuracyRank, compositeValue: (landRank + accuracyRank) / 2 };
  });

  withComposite.sort((a, b) => {
    if (a.compositeValue !== b.compositeValue) return a.compositeValue - b.compositeValue;
    return a.landRank - b.landRank; // 동점이면 땅 점수 순위가 높은 쪽을 우선
  });

  return withComposite.map(({ teamId, landRank, accuracyRank }, i) => ({
    teamId,
    compositeRank: i + 1,
    landRank,
    accuracyRank,
  }));
}
