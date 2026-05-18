'use client';

import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useQuestionnaireSpec } from '../../../hooks/useQuestionnaireSpec';
import { useSubmitResponse } from '../../../hooks/useSubmitResponse';
import type { Answers, Question } from '../../../types/spec';

// ─── Static star positions (deterministic — no hydration mismatch) ──────────
const STARS = [
  { top: '4%',  left: '10%', size: 1.5, delay: '0s'   },
  { top: '9%',  left: '72%', size: 2.5, delay: '0.8s' },
  { top: '3%',  left: '48%', size: 1,   delay: '1.4s' },
  { top: '16%', left: '28%', size: 2,   delay: '0.3s' },
  { top: '6%',  left: '88%', size: 1,   delay: '2.0s' },
  { top: '22%', left: '93%', size: 2,   delay: '1.1s' },
  { top: '11%', left: '18%', size: 1,   delay: '2.3s' },
  { top: '19%', left: '60%', size: 1.5, delay: '0.6s' },
  { top: '7%',  left: '38%', size: 2.5, delay: '1.7s' },
  { top: '26%', left: '4%',  size: 1.5, delay: '0.2s' },
  { top: '13%', left: '55%', size: 1,   delay: '1.0s' },
  { top: '2%',  left: '82%', size: 2,   delay: '0.5s' },
];

// ─── Shared background ────────────────────────────────────────────────────────
const BG = 'min-h-dvh bg-[#080d24] relative overflow-x-hidden';

export default function SleepQualityPage() {
  // ─── Auto-derived identifiers ─────────────────────────────────────────────
  const pathname = usePathname();
  const params   = useSearchParams();
  const KEY        = pathname.split('/').filter(Boolean).pop() ?? '';
  const PRODUCT_ID = params.get('product') ?? '';

  const missingProduct = !PRODUCT_ID;

  const { meta, isLoading, error: specError } = useQuestionnaireSpec(PRODUCT_ID, KEY);
  const { submit, isSubmitting, error: submitError, result } = useSubmitResponse(PRODUCT_ID, KEY);
  const [answers, setAnswers] = useState<Answers>({});

  const onSelect = (questionId: string, choiceId: string) =>
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));

  const onMultiToggle = (questionId: string, choiceId: string) =>
    setAnswers((prev) => {
      const existing = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      return {
        ...prev,
        [questionId]: existing.includes(choiceId)
          ? existing.filter((c) => c !== choiceId)
          : [...existing, choiceId],
      };
    });

  const onSubmit = async () => {
    try { await submit(answers); } catch { /* surfaced via submitError */ }
  };

  // ─── Missing product ───────────────────────────────────────────────────────
  if (missingProduct) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <span className="text-4xl">🌙</span>
            <p className="mt-4 font-semibold text-white">缺少 product 參數</p>
            <p className="mt-2 text-sm text-white/40">
              正確的 LIFF URL 應該包含：<br />
              <code className="text-purple-300 text-xs">?path=/q/{KEY}&amp;product=&lt;productId&gt;</code>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex flex-col items-center justify-center gap-4">
          <span className="text-4xl animate-pulse">🌙</span>
          <p className="text-white/40 text-sm">載入問卷中...</p>
        </main>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (specError || !meta) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex items-center justify-center p-8 text-center">
          <div>
            <span className="text-4xl">🌑</span>
            <p className="mt-4 text-red-400 font-medium">無法載入問卷</p>
            <p className="mt-1 text-sm text-white/40">{specError ?? '找不到此問卷'}</p>
          </div>
        </main>
      </div>
    );
  }

  // ─── Result ────────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className={BG}>
        <StarField />
        <main className="relative z-10 min-h-dvh flex flex-col items-center justify-center gap-6 px-6 py-12 max-w-xl mx-auto">
          <span className="text-5xl">🌙</span>
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-white">填答完成</h1>
            <p className="mt-1 text-sm text-white/40">感謝你的分享，祝你好眠 ✨</p>
          </div>
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-white/40 text-xs uppercase tracking-widest mb-4">睡眠評估結果</p>
            <ul className="flex flex-col gap-3">
              {Object.entries(result.scores).map(([k, v]) => (
                <li key={k} className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">{k}</span>
                  <span className="text-purple-300 font-semibold text-xl">{String(v)}</span>
                </li>
              ))}
            </ul>
            {Object.keys(result.interpretation).length > 0 && (
              <>
                <div className="my-4 border-t border-white/10" />
                <ul className="flex flex-col gap-2">
                  {Object.entries(result.interpretation).map(([k, v]) => (
                    <li key={k} className="text-sm">
                      <span className="text-white/40">{k}：</span>
                      <span className="text-white/80">{v}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className={BG}>
      <StarField />
      <main className="relative z-10 max-w-xl mx-auto px-5 pt-10 pb-16 flex flex-col gap-8">

        {/* Header */}
        <header className="flex flex-col items-center text-center gap-3 animate-fade-slide-up">
          <span className="text-5xl">🌙</span>
          <h1 className="text-2xl font-semibold text-white">{meta.name}</h1>
          {meta.description && (
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">{meta.description}</p>
          )}
        </header>

        {/* Question sets */}
        {meta.spec.question_sets.map((set, setIdx) =>
          !set.questions || set.questions.length === 0 ? null : (
            <section key={set.key} className="flex flex-col gap-3">
              {set.name && (
                <h2 className="text-purple-300/70 text-xs uppercase tracking-widest pl-1">
                  {set.name}
                </h2>
              )}
              {set.questions.map((q, qIdx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  value={answers[q.id]}
                  onSelect={(cid) => onSelect(q.id, cid)}
                  onMultiToggle={(cid) => onMultiToggle(q.id, cid)}
                  animDelay={`${(setIdx * 5 + qIdx) * 0.07}s`}
                />
              ))}
            </section>
          ),
        )}

        {/* Submit error */}
        {submitError && (
          <div className="bg-red-900/30 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
            {submitError}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 active:scale-95 text-white font-semibold rounded-2xl py-4 transition-all duration-200 disabled:opacity-50 shadow-[0_0_32px_rgba(139,92,246,0.35)]"
        >
          {isSubmitting ? '送出中...' : '送出'}
        </button>
      </main>
    </div>
  );
}

// ─── Star field ────────────────────────────────────────────────────────────────
function StarField() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {STARS.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay,
          }}
        />
      ))}
    </div>
  );
}

// ─── Question card ─────────────────────────────────────────────────────────────
function QuestionCard({
  question,
  value,
  onSelect,
  onMultiToggle,
  animDelay,
}: {
  question: Question;
  value: string | string[] | number | undefined;
  onSelect: (choiceId: string) => void;
  onMultiToggle: (choiceId: string) => void;
  animDelay: string;
}) {
  return (
    <div
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 flex flex-col gap-4 animate-fade-slide-up"
      style={{ animationDelay: animDelay }}
    >
      <p className="text-white/90 font-medium leading-relaxed">{question.text}</p>
      {question.description && (
        <p className="text-white/40 text-sm -mt-2">{question.description}</p>
      )}

      {/* Single selection */}
      {question.kind === 'single_selection' && question.choices && (
        <div className="flex flex-col gap-2">
          {question.choices.map((c) => {
            const selected = value === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 active:scale-[0.98] ${
                  selected
                    ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.18)]'
                    : 'bg-white/5 border-white/10 text-white/65 hover:border-white/25 hover:bg-white/8'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Multiple selection */}
      {question.kind === 'multiple_selection' && question.choices && (
        <div className="flex flex-col gap-2">
          {question.choices.map((c) => {
            const checked = Array.isArray(value) && value.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onMultiToggle(c.id)}
                className={`text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 active:scale-[0.98] ${
                  checked
                    ? 'bg-purple-500/20 border-purple-400/60 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.18)]'
                    : 'bg-white/5 border-white/10 text-white/65 hover:border-white/25 hover:bg-white/8'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Score */}
      {question.kind === 'score' && (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 w-full focus:outline-none focus:border-purple-400/60 transition-colors"
        />
      )}

      {/* Text */}
      {question.kind === 'text' && (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 w-full focus:outline-none focus:border-purple-400/60 transition-colors placeholder:text-white/20"
        />
      )}

      {/* Date */}
      {question.kind === 'date' && (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 w-full focus:outline-none focus:border-purple-400/60 transition-colors"
        />
      )}
    </div>
  );
}
