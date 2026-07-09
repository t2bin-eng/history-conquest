"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseQuestionWorkbook, type ParseRowError } from "@/lib/questionUpload/parseWorkbook";
import { bulkInsertQuestions, getQuestionBankSummary } from "@/lib/supabase/queries";
import type { QuestionBankSummary, UploadQuestionInput } from "@/lib/supabase/types";
import { difficultyLabel } from "@/lib/regionDisplay";
import { stripQuestionHtmlForPreview } from "@/lib/sanitizeQuestionHtml";

export default function QuestionBankPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [summary, setSummary] = useState<QuestionBankSummary | null>(null);
  const [parsed, setParsed] = useState<{ valid: UploadQuestionInput[]; errors: ParseRowError[] } | null>(
    null
  );
  const [fileName, setFileName] = useState<string | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const loadSummary = async () => {
    const data = await getQuestionBankSummary();
    setSummary(data);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 최초 마운트 시 1회 데이터 조회
    loadSummary();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploadMessage(null);
    setIsParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await parseQuestionWorkbook(buffer);
      setParsed(result);
    } catch {
      setParsed({ valid: [], errors: [{ row: 0, message: "파일을 읽을 수 없습니다. 양식을 확인해주세요." }] });
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpload = async () => {
    if (!parsed || parsed.valid.length === 0) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      const result = await bulkInsertQuestions(parsed.valid, replaceExisting);
      setUploadMessage(`${result.inserted}개 문제를 저장했습니다.`);
      setParsed(null);
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadSummary();
    } catch {
      setUploadMessage("업로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">문제 은행 관리</h1>
          <p className="text-sm text-neutral-400">
            엑셀 양식을 업로드해 퀴즈 문제를 등록하세요.
          </p>
        </div>
        <Link href="/teacher" className="text-sm text-blue-400 hover:underline">
          교사 대시보드로
        </Link>
      </header>

      <section className="rounded-lg border border-neutral-800 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-300">현재 문제 은행</p>
        {summary ? (
          <p className="mt-1 text-sm text-neutral-400">
            총 {summary.total}개
            {summary.total > 0 && (
              <>
                {" "}
                (하 {summary.byDifficulty.LOW ?? 0} · 중 {summary.byDifficulty.MID ?? 0} · 고{" "}
                {summary.byDifficulty.HIGH ?? 0})
              </>
            )}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">불러오는 중...</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 px-4 py-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-neutral-300">
          엑셀 파일 선택
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
          />
        </label>

        {isParsing && <p className="text-sm text-neutral-500">파일을 확인하는 중...</p>}

        {parsed && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-neutral-300">
              <span className="font-mono text-xs text-neutral-500">{fileName}</span> — 정상{" "}
              <span className="font-semibold text-green-400">{parsed.valid.length}</span>개, 오류{" "}
              <span className="font-semibold text-red-400">{parsed.errors.length}</span>개
            </p>

            {parsed.errors.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md bg-neutral-900 p-2 text-xs text-red-400">
                {parsed.errors.map((err, i) => (
                  <li key={i}>
                    {err.row}행: {err.message}
                  </li>
                ))}
              </ul>
            )}

            {parsed.valid.length > 0 && (
              <ul className="max-h-40 overflow-y-auto rounded-md bg-neutral-900 p-2 text-xs text-neutral-400">
                {parsed.valid.slice(0, 5).map((q, i) => (
                  <li key={i}>
                    [{difficultyLabel(q.difficulty)}] {stripQuestionHtmlForPreview(q.text)}
                  </li>
                ))}
                {parsed.valid.length > 5 && <li>... 외 {parsed.valid.length - 5}개</li>}
              </ul>
            )}

            <label className="flex items-center gap-2 text-xs text-neutral-400">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              기존 문제 은행을 모두 지우고 업로드 (체크 안 하면 추가됩니다)
            </label>

            <button
              type="button"
              onClick={handleUpload}
              disabled={parsed.valid.length === 0 || isUploading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {isUploading ? "업로드 중..." : `${parsed.valid.length}개 문제 저장하기`}
            </button>
          </div>
        )}

        {uploadMessage && <p className="text-sm text-green-400">{uploadMessage}</p>}
      </section>
    </main>
  );
}
