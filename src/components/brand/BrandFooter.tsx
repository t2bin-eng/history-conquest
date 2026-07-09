"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

/** 교사 대기실(게임 시작 전) 화면에만 표시되는 제작자 워터마크. 그 외
 * 모든 화면(홈, 학생 화면, 실시간 관제, 전광판, 결과 등)에서는 숨긴다. */
export function BrandFooter() {
  const pathname = usePathname();
  const status = useGameStore((s) => s.game.status);
  const isTeacherWaitingRoom = pathname === "/teacher" && status === "WAITING";
  if (!isTeacherWaitingRoom) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-1">
      <div className="pointer-events-auto rounded-t-md bg-neutral-950/70 px-3 py-1 backdrop-blur-sm">
        <Image
          src="/brand/jai-edu-lab-logo.png"
          alt="J-AI EDU LAB."
          width={488}
          height={249}
          className="h-[100px] w-auto opacity-80"
          priority={false}
        />
      </div>
    </div>
  );
}
