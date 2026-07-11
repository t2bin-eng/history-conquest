import type { GameHistoryEntry } from "@/lib/supabase/types";

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadGameHistoryCsv(entries: GameHistoryEntry[], classNumber: number) {
  const headers = ["게임 코드", "종료 일시", "순위", "팀", "점수"];
  const rows = entries.flatMap((entry) => {
    const endedAt = entry.endedAt
      ? new Date(entry.endedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })
      : "";
    if (entry.teams.length === 0) {
      return [[entry.code, endedAt, "", "", ""]];
    }
    return entry.teams.map((team, i) => [entry.code, endedAt, i + 1, team.name, team.score]);
  });

  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");

  // 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `역사정복_${classNumber}반_결과기록_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
