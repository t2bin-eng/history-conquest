import Link from "next/link";

const ROUTES = [
  { href: "/", label: "홈" },
  { href: "/join", label: "게임 코드 입력" },
  { href: "/register", label: "팀 등록" },
  { href: "/lobby", label: "학생 대기실" },
  { href: "/teacher", label: "교사 대시보드" },
  { href: "/teacher/questions", label: "문제 은행" },
  { href: "/play", label: "게임 플레이" },
  { href: "/display", label: "전광판" },
  { href: "/results", label: "결과" },
];

/** 개발 중 화면 간 빠른 이동용. */
export function DevNav() {
  return (
    <nav className="flex gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-2 text-xs text-neutral-400">
      {ROUTES.map((route) => (
        <Link key={route.href} href={route.href} className="hover:text-white">
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
