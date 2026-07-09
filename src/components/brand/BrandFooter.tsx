"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

// 실제 플레이에 방해되지 않도록, 학생이 게임을 진행하는 화면에서는 로고를 숨긴다.
const HIDDEN_ON = ["/register", "/lobby", "/play"];

/** 학생 플레이 화면을 제외한 화면 하단에 고정 표시되는 제작자 워터마크. */
export function BrandFooter() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((path) => pathname?.startsWith(path))) return null;

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
