import Image from "next/image";

/** 모든 화면 하단에 고정 표시되는 제작자 워터마크. */
export function BrandFooter() {
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
