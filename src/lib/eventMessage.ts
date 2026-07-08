import type { EventLog, Region, Team } from "@/types/game";

export function eventToMessage(event: EventLog, teams: Team[], regions: Region[]): string {
  const teamName = teams.find((t) => t.id === event.teamId)?.name ?? "알 수 없는 팀";
  const regionName = regions.find((r) => r.id === event.regionId)?.name ?? "알 수 없는 지역";

  switch (event.type) {
    case "CAPTURE":
      return `🚩 ${teamName}이(가) ${regionName} 지역을 정복했습니다!`;
    case "RECONQUEST":
      return `⚔️ ${teamName}이(가) ${regionName} 지역을 탈환했습니다!`;
    case "SURROUND":
      return `🛡️ ${teamName}이(가) ${regionName} 지역을 포위 편입했습니다!`;
    case "WRONG_ANSWER":
      return `❌ ${teamName}이(가) ${regionName} 문제를 틀렸습니다.`;
    case "CARD_USED":
      return `🃏 ${teamName}이(가) 카드를 사용했습니다.`;
    default:
      return "";
  }
}
