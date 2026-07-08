"use client";

import { useEffect, useRef, useState } from "react";
import type { RpcQuestion } from "@/lib/supabase/types";

interface QuizModalProps {
  question: RpcQuestion;
  regionName: string;
  onAnswer: (choice: string) => void;
  onTimeUp: () => void;
}

export function QuizModal({ question, regionName, onAnswer, onTimeUp }: QuizModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        className={`w-full max-w-md rounded-xl bg-neutral-900 p-6 shadow-2xl ring-1 ring-neutral-800 ${
          urgent ? "animate-[shake_0.3s_ease-in-out_infinite]" : ""
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">
            {regionName} · {question.category}
          </span>
          <TimerGauge progress={progress} timeLeft={timeLeft} urgent={urgent} />
        </div>

        <p className="mb-5 text-base font-semibold leading-snug text-white">{question.text}</p>

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
