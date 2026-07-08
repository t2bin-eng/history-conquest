"use client";

import { useEffect, useState } from "react";
import type { Game } from "@/types/game";

export function useRemainingSeconds(game: Game): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (game.isPaused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [game.isPaused]);

  if (!game.startedAt) return game.timeLimitSec;

  const referenceTime =
    game.isPaused && game.pausedAt ? new Date(game.pausedAt).getTime() : now;
  const elapsedSec = Math.floor((referenceTime - new Date(game.startedAt).getTime()) / 1000);
  return Math.max(0, game.timeLimitSec - elapsedSec);
}
