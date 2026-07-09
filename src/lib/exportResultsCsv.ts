import type { EventLog, Team } from "@/types/game";
import { computeTeamStats } from "@/lib/teamStats";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadResultsCsv(rankedTeams: Team[], eventLogs: EventLog[], gameCode: string | null) {
  const headers = ["순위", "팀", "점수", "점령 지역 수", "정답", "오답", "탈환 성공"];
  const rows = rankedTeams.map((t, i) => {
    const stats = computeTeamStats(t, eventLogs);
    return [
      i + 1,
      t.name,
      t.score,
      t.ownedRegionIds.length,
      stats.correctCount,
      stats.wrongCount,
      stats.reconquestCount,
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\r\n");

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `역사정복_결과_${gameCode ?? dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
