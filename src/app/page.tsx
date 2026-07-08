import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
      <h1 className="text-2xl font-bold text-white">역사 정복 — History Conquest</h1>
      <p className="max-w-sm text-sm text-neutral-400">
        지도를 점령해가는 실시간 팀 대항 역사 퀴즈 게임
      </p>
      <Link
        href="/register"
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
      >
        팀 등록하고 시작하기
      </Link>
    </main>
  );
}
