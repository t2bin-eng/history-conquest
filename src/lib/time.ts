export function formatMMSS(totalSec: number): string {
  const clamped = Math.max(0, Math.floor(totalSec));
  const mm = Math.floor(clamped / 60)
    .toString()
    .padStart(2, "0");
  const ss = (clamped % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}
