import type { Question, RegionDifficulty } from "@/types/game";

type QuestionTemplate = Omit<Question, "id" | "regionId" | "teamId">;

/**
 * 실제 문제 은행이 확정되기 전까지 사용하는 임시 목업 문제.
 * (지시서 9장 "문제 은행 관리자 화면" 구현 시 DB/CMS 데이터로 교체 예정)
 */
const QUESTION_BANK: Record<RegionDifficulty, QuestionTemplate[]> = {
  LOW: [
    {
      category: "선사·고대",
      difficulty: "LOW",
      text: "우리나라 최초의 국가는 무엇인가?",
      choices: ["고조선", "부여", "옥저", "동예"],
      answer: "고조선",
      timeLimitSec: 15,
    },
    {
      category: "고려",
      difficulty: "LOW",
      text: "고려를 세운 인물은 누구인가?",
      choices: ["왕건", "궁예", "견훤", "신돈"],
      answer: "왕건",
      timeLimitSec: 15,
    },
    {
      category: "조선",
      difficulty: "LOW",
      text: "조선을 건국한 인물은 누구인가?",
      choices: ["이성계", "이방원", "정도전", "최영"],
      answer: "이성계",
      timeLimitSec: 15,
    },
    {
      category: "근현대",
      difficulty: "LOW",
      text: "3·1 운동이 일어난 연도는?",
      choices: ["1919년", "1910년", "1929년", "1945년"],
      answer: "1919년",
      timeLimitSec: 15,
    },
  ],
  MID: [
    {
      category: "삼국시대",
      difficulty: "MID",
      text: "신라의 삼국 통일을 완성한 왕은 누구인가?",
      choices: ["문무왕", "무열왕", "진흥왕", "선덕여왕"],
      answer: "문무왕",
      timeLimitSec: 18,
    },
    {
      category: "고려",
      difficulty: "MID",
      text: "몽골의 침입에 맞서 고려 정부가 수도를 옮긴 섬은?",
      choices: ["강화도", "제주도", "울릉도", "거제도"],
      answer: "강화도",
      timeLimitSec: 18,
    },
    {
      category: "조선",
      difficulty: "MID",
      text: "훈민정음을 창제한 왕은 누구인가?",
      choices: ["세종", "태종", "성종", "정조"],
      answer: "세종",
      timeLimitSec: 18,
    },
    {
      category: "근현대",
      difficulty: "MID",
      text: "1920년 김좌진 장군이 일본군을 크게 물리친 전투는?",
      choices: ["청산리 전투", "봉오동 전투", "홍경성 전투", "간도 참변"],
      answer: "청산리 전투",
      timeLimitSec: 18,
    },
  ],
  HIGH: [
    {
      category: "근현대",
      difficulty: "HIGH",
      text: "1907년 헤이그 특사로 파견되어 을사늑약의 부당함을 알리려 한 인물이 아닌 사람은?",
      choices: ["안중근", "이상설", "이준", "이위종"],
      answer: "안중근",
      timeLimitSec: 20,
    },
    {
      category: "조선",
      difficulty: "HIGH",
      text: "임진왜란 당시 한산도 대첩을 승리로 이끈 장수는?",
      choices: ["이순신", "권율", "곽재우", "김시민"],
      answer: "이순신",
      timeLimitSec: 20,
    },
    {
      category: "고려",
      difficulty: "HIGH",
      text: "고려 시대에 제작된 세계 최초의 금속활자본은?",
      choices: ["직지심체요절", "팔만대장경", "삼국유사", "동의보감"],
      answer: "직지심체요절",
      timeLimitSec: 20,
    },
    {
      category: "근현대",
      difficulty: "HIGH",
      text: "1932년 상하이 훙커우 공원에서 일본군 요인을 폭탄으로 저격한 인물은?",
      choices: ["윤봉길", "이봉창", "나석주", "김익상"],
      answer: "윤봉길",
      timeLimitSec: 20,
    },
  ],
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function drawQuestion(
  difficulty: RegionDifficulty,
  regionId: string,
  teamId: string
): Question {
  const pool = QUESTION_BANK[difficulty];
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    id: createId("question"),
    regionId,
    teamId,
  };
}
