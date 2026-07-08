import type { RegionDifficulty } from "@/types/game";

export const DIFFICULTY_LABEL: Record<RegionDifficulty, string> = {
  LOW: "하",
  MID: "중",
  HIGH: "고",
};

export const NEUTRAL_FILL: Record<RegionDifficulty, string> = {
  LOW: "#27272a",
  MID: "#3f3f46",
  HIGH: "#52525b",
};

export function difficultyLabel(difficulty: RegionDifficulty) {
  return DIFFICULTY_LABEL[difficulty];
}
