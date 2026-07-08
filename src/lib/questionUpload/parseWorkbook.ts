import ExcelJS from "exceljs";
import type { UploadQuestionInput } from "@/lib/supabase/types";

const DIFFICULTY_MAP: Record<string, "LOW" | "MID" | "HIGH"> = {
  하: "LOW",
  중: "MID",
  고: "HIGH",
  LOW: "LOW",
  MID: "MID",
  HIGH: "HIGH",
};

export interface ParseRowError {
  row: number;
  message: string;
}

export interface ParseResult {
  valid: UploadQuestionInput[];
  errors: ParseRowError[];
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  if (typeof value === "object" && "result" in value) return String(value.result ?? "").trim();
  return String(value).trim();
}

export async function parseQuestionWorkbook(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet("문제_양식") ?? workbook.worksheets[0];
  if (!sheet) {
    return { valid: [], errors: [{ row: 0, message: "시트를 찾을 수 없습니다." }] };
  }

  const valid: UploadQuestionInput[] = [];
  const errors: ParseRowError[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // 헤더

    const category = cellText(row.getCell(1).value);
    const difficultyRaw = cellText(row.getCell(2).value);
    const text = cellText(row.getCell(3).value);
    const choices = [4, 5, 6, 7, 8].map((c) => cellText(row.getCell(c).value));
    const answerIndexRaw = cellText(row.getCell(9).value);
    const timeLimitRaw = cellText(row.getCell(10).value);

    const isEmptyRow = !category && !difficultyRaw && !text && choices.every((c) => !c);
    if (isEmptyRow) return;

    const rowErrors: string[] = [];
    if (!category) rowErrors.push("카테고리 누락");
    const difficulty = DIFFICULTY_MAP[difficultyRaw];
    if (!difficulty) rowErrors.push(`난이도 값이 올바르지 않음(${difficultyRaw || "빈칸"})`);
    if (!text) rowErrors.push("문제 누락");
    if (choices.some((c) => !c)) rowErrors.push("선택지 5개를 모두 채워야 함");

    const answerIndex = Number(answerIndexRaw);
    if (!Number.isInteger(answerIndex) || answerIndex < 1 || answerIndex > 5) {
      rowErrors.push(`정답번호가 올바르지 않음(${answerIndexRaw || "빈칸"})`);
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join(", ") });
      return;
    }

    const timeLimitSec = timeLimitRaw ? Number(timeLimitRaw) : undefined;

    valid.push({
      category,
      difficulty,
      text,
      choices,
      answer: choices[answerIndex - 1],
      time_limit_sec:
        timeLimitSec && Number.isFinite(timeLimitSec) ? timeLimitSec : undefined,
    });
  });

  return { valid, errors };
}
