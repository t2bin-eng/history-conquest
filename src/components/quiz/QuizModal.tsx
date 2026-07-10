"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { RpcQuestion } from "@/lib/supabase/types";
import { sanitizeQuestionHtml } from "@/lib/sanitizeQuestionHtml";

interface QuizModalProps {
  question: RpcQuestion;
  regionName: string;
  isBettingZone: boolean;
  onAnswer: (choice: string) => void;
  onTimeUp: () => void;
}

export function QuizModal({
  question,
  regionName,
  isBettingZone,
  onAnswer,
  onTimeUp,
}: QuizModalProps) {
  const [timeLeft, setTimeLeft] = useState(question.timeLimitSec);
  const [answered, setAnswered] = useState(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (answered) return;
    if (timeLeft <= 0) {
      onTimeUpRef.current();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, answered]);

  const handleChoiceClick = (choice: string) => {
    if (answered) return;
    setAnswered(true);
    onAnswer(choice);
  };

  const progress = timeLeft / question.timeLimitSec;
  const urgent = timeLeft <= 5 && timeLeft > 0;
  // 문제 은행에 HTML(자료 박스 등)로 업로드된 문제와, 예전처럼 순수 텍스트로
  // 업로드된 문제를 모두 같은 방식으로 안전하게 렌더링한다 — 순수 텍스트는
  // 정제해도 내용이 그대로 유지되므로 분기 없이 하나로 처리 가능하다.
  const sanitizedText = useMemo(() => sanitizeQuestionHtml(question.text), [question.text]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className={`w-full max-w-md rounded-xl bg-neutral-900 p-6 shadow-2xl ring-1 ${
          isBettingZone ? "ring-2 ring-amber-400" : "ring-neutral-800"
        } ${urgent ? "animate-[shake_0.3s_ease-in-out_infinite]" : ""}`}
        style={
          isBettingZone
            ? { boxShadow: "0 0 0 1px rgba(251,191,36,0.4), 0 0 24px rgba(251,191,36,0.35)" }
            : undefined
        }
      >
        {isBettingZone && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className="mb-4 flex items-center gap-2 rounded-lg bg-amber-400/15 px-3 py-2 ring-1 ring-amber-400/40"
          >
            <span className="text-lg">⚡</span>
            <div className="text-xs leading-snug text-amber-300">
              <p className="font-bold">베팅존입니다!</p>
              <p className="text-amber-300/80">정답 시 점수 2배, 오답 시 감점돼요.</p>
            </div>
          </motion.div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">
            {regionName} · {question.category}
          </span>
          <TimerGauge progress={progress} timeLeft={timeLeft} urgent={urgent} />
        </div>

        <div
          className="mb-5 rounded-lg bg-white p-4 text-sm font-medium leading-relaxed text-neutral-900 [&_*]:max-w-full"
          dangerouslySetInnerHTML={{ __html: sanitizedText }}
        />

        <div className="grid grid-cols-1 gap-2">
          {question.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              disabled={answered}
              onClick={() => handleChoiceClick(choice)}
              className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-left text-sm text-neutral-100 hover:border-blue-500 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimerGauge({
  progress,
  timeLeft,
  urgent,
}: {
  progress: number;
  timeLeft: number;
  urgent: boolean;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div className="relative h-10 w-10 shrink-0">
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
        <circle cx="20" cy="20" r={radius} fill="none" stroke="#3f3f46" strokeWidth="4" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          stroke={urgent ? "#ef4444" : "#3b82f6"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${
          urgent ? "text-red-400" : "text-white"
        }`}
      >
        {timeLeft}
      </span>
    </div>
  );
}
