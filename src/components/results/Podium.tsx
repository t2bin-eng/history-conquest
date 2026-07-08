"use client";

import { motion } from "framer-motion";
import type { Team } from "@/types/game";

interface PodiumProps {
  rankedTeams: Team[];
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PLATFORM_HEIGHT = ["h-32", "h-24", "h-16"];
const ORDER = [1, 0, 2]; // 2nd, 1st, 3rd 순서로 배치

export function Podium({ rankedTeams }: PodiumProps) {
  const top3 = rankedTeams.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-4">
      {ORDER.filter((i) => i < top3.length).map((rankIndex) => {
        const team = top3[rankIndex];
        const isFirst = rankIndex === 0;
        return (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: rankIndex * 0.15, type: "spring", stiffness: 120 }}
            className="flex flex-col items-center gap-2"
          >
            <motion.div
              animate={isFirst ? { scale: [1, 1.08, 1] } : undefined}
              transition={isFirst ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-3xl">{MEDALS[rankIndex]}</span>
              <div
                className={`flex items-center justify-center overflow-hidden rounded-md border-2 ${
                  isFirst ? "h-16 w-16" : "h-12 w-12"
                }`}
                style={{ backgroundColor: team.color, borderColor: team.color }}
              >
                {team.flagImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.flagImageUrl}
                    alt={`${team.name} 깃발`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-white/70">깃발</span>
                )}
              </div>
              <p className={`font-bold text-white ${isFirst ? "text-lg" : "text-sm"}`}>
                {team.name}
              </p>
              <p className="text-xs text-neutral-400">{team.score}점</p>
            </motion.div>
            <div
              className={`w-24 rounded-t-md ${PLATFORM_HEIGHT[rankIndex]}`}
              style={{ backgroundColor: team.color, opacity: 0.35 }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
