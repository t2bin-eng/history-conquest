import type { EventLog, Team } from "@/types/game";

export interface TeamStats {
  correctCount: number;
  wrongCount: number;
  reconquestCount: number;
}

export function computeTeamStats(team: Team, eventLogs: EventLog[]): TeamStats {
  let correctCount = 0;
  let wrongCount = 0;
  let reconquestCount = 0;

  for (const event of eventLogs) {
    if (event.teamId !== team.id) continue;
    if (event.type === "CAPTURE") {
      correctCount++;
    } else if (event.type === "RECONQUEST") {
      correctCount++;
      reconquestCount++;
    } else if (event.type === "WRONG_ANSWER") {
      wrongCount++;
    }
  }

  return { correctCount, wrongCount, reconquestCount };
}
