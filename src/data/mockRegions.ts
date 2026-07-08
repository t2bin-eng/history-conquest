import type { Region, RegionDifficulty } from "@/types/game";

/**
 * 실제 역사 지도가 확정되기 전까지 사용하는 임시 격자형 지도.
 * (지시서 10장 "미해결 논의" — 실제 지도 확정 시 svgPath/이름만 교체하면 됨)
 */
const GRID_COLS = 5;
const GRID_ROWS = 4;
const CELL_SIZE = 120;
const GAP = 6;

const REGION_NAMES = [
  "의주", "함흥", "평양", "원산", "개성",
  "한성", "강화", "충주", "청주", "전주",
  "남원", "진주", "부산", "경주", "안동",
  "제주", "울릉", "독도", "강릉", "춘천",
];

function colRow(index: number) {
  return { col: index % GRID_COLS, row: Math.floor(index / GRID_COLS) };
}

function difficultyFor(col: number, row: number): { difficulty: RegionDifficulty; points: number } {
  const centerCol = (GRID_COLS - 1) / 2;
  const centerRow = (GRID_ROWS - 1) / 2;
  const dist = Math.hypot(col - centerCol, row - centerRow);

  if (dist <= 1) return { difficulty: "HIGH", points: 5 };
  if (dist <= 2) return { difficulty: "MID", points: 2 };
  return { difficulty: "LOW", points: 1 };
}

function adjacentIndices(index: number): number[] {
  const { col, row } = colRow(index);
  const neighbors: number[] = [];
  const deltas = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dc, dr] of deltas) {
    const c = col + dc;
    const r = row + dr;
    if (c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS) {
      neighbors.push(r * GRID_COLS + c);
    }
  }
  return neighbors;
}

export function generateMockRegions(): Region[] {
  return REGION_NAMES.map((name, index) => {
    const { col, row } = colRow(index);
    const { difficulty, points } = difficultyFor(col, row);
    const x = col * (CELL_SIZE + GAP);
    const y = row * (CELL_SIZE + GAP);

    return {
      id: `region-${index + 1}`,
      name,
      difficulty,
      points,
      ownerTeamId: null,
      status: "NEUTRAL",
      cooldownUntil: null,
      adjacentRegionIds: adjacentIndices(index).map((i) => `region-${i + 1}`),
      failedTeamIds: [],
      svgPath: `M${x},${y} h${CELL_SIZE} v${CELL_SIZE} h-${CELL_SIZE} Z`,
      labelPosition: { x: x + CELL_SIZE / 2, y: y + CELL_SIZE / 2 },
    };
  });
}

export const MOCK_MAP_VIEWBOX = {
  width: GRID_COLS * (CELL_SIZE + GAP) - GAP,
  height: GRID_ROWS * (CELL_SIZE + GAP) - GAP,
};
