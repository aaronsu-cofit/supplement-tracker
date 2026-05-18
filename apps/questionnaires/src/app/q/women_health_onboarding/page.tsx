'use client';
// ╔══════════════════════════════════════════════════════════════════╗
// ║  women_health_onboarding — 28-question intake split across 6     ║
// ║  sections (花花版問卷). Section-paginated UX: each "page" shows  ║
// ║  one question_set. Questions with visible_if are hidden when     ║
// ║  conditions aren't met; sections with no visible questions get   ║
// ║  skipped entirely.                                                ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  Baby,
  Check,
  ChevronLeft,
  Clock,
  Cloud,
  CloudRain,
  Droplet,
  Droplets,
  HelpCircle,
  Leaf,
  Pause,
  Pill,
  Plus,
  SkipForward,
  Sparkles,
  Stethoscope,
  Sun,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useQuestionnaireSpec } from '../../../hooks/useQuestionnaireSpec';
import { useSubmitResponse } from '../../../hooks/useSubmitResponse';
import type {
  Answer,
  Answers,
  NumericCondition,
  Question,
  VisibleIfClause,
} from '../../../types/spec';

// Visual metadata: icons for choice cards. Scale (0–4) questions render
// as Likert dots and don't need icons. Add entries as new card-style
// questions are added in HQ.
const ICONS: Record<string, Record<string, LucideIcon>> = {
  physiological_state: {
    having_period: Activity,
    menopause: Pause,
    pregnant: Baby,
    breastfeeding: Droplets,
    post_surgery: Stethoscope,
    unsure: HelpCircle,
  },
  medications: {
    none: Check,
    oral_contraceptive: Pill,
    hormone_therapy: Sparkles,
    glp1_or_weight_loss: Zap,
    other: Plus,
    unsure: HelpCircle,
  },
  cycle_regularity: {
    mostly_regular: Sun,
    occasionally_irregular: Cloud,
    often_irregular: CloudRain,
    unsure: HelpCircle,
  },
  cycle_issues: {
    delayed: Clock,
    skipped: SkipForward,
    length_varies: Activity,
    heavy_flow: Droplets,
    light_flow: Droplet,
    none: Check,
  },
};

// Question IDs that should render as a 2-col grid instead of a vertical list.
const GRID_LAYOUT_QS = new Set(['cycle_issues']);

const BG = 'min-h-dvh bg-wh-surface text-wh-ink-1 relative overflow-x-hidden';

// ─── visible_if evaluator ───────────────────────────────────────────────────
function evalClause(clause: VisibleIfClause, answers: Answers): boolean {
  for (const [qid, cond] of Object.entries(clause)) {
    const v = answers[qid];
    if (typeof cond === 'string') {
      if (v !== cond) return false;
    } else {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) return false;
      const c = cond as NumericCondition;
      if ('eq' in c && n !== c.eq) return false;
      if ('gt' in c && !(n > c.gt)) return false;
      if ('gte' in c && !(n >= c.gte)) return false;
      if ('lt' in c && !(n < c.lt)) return false;
      if ('lte' in c && !(n <= c.lte)) return false;
    }
  }
  return true;
}
function isVisible(q: Question, answers: Answers): boolean {
  if (!q.visible_if) return true;
  const v = q.visible_if;
  const all = (v as { all?: VisibleIfClause[] }).all;
  if (Array.isArray(all)) return all.every((c) => evalClause(c, answers));
  return evalClause(v as VisibleIfClause, answers);
}

function isLikert(q: Question): boolean {
  if (q.kind !== 'single_selection' || !q.choices) return false;
  if (q.choices.length !== 5) return false;
  return q.choices.every((c, i) => c.id === String(i));
}

function isAnswered(q: Question, answers: Answers): boolean {
  if (q.required === false) return true;
  const v = answers[q.id];
  if (q.kind === 'multiple_selection') return Array.isArray(v) && v.length > 0;
  return typeof v === 'string' && v.length > 0;
}

export default function WomenHealthOnboardingPage() {
  const pathname = usePathname();
  const params = useSearchParams();
  const KEY = pathname.split('/').filter(Boolean).pop() ?? '';
  const PRODUCT_ID = params.get('product') ?? '';

  const missingProduct = !PRODUCT_ID;

  const { meta, isLoading, error: specError } = useQuestionnaireSpec(PRODUCT_ID, KEY);
  const { submit, isSubmitting, error: submitError, result } = useSubmitResponse(PRODUCT_ID, KEY);

  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const sets = meta?.spec.question_sets ?? [];
  const visibleSets = useMemo(
    () => sets.filter((s) => (s.questions ?? []).some((q) => isVisible(q, answers))),
    [sets, answers],
  );
  const safeStep = Math.min(step, Math.max(0, visibleSets.length - 1));
  const currentSet = visibleSets[safeStep];
  const visibleQuestions = useMemo(
    () => (currentSet?.questions ?? []).filter((q) => isVisible(q, answers)),
    [currentSet, answers],
  );
  const total = visibleSets.length;
  const isLast = safeStep === total - 1;
  const progress = total > 0 ? ((safeStep + 1) / total) * 100 : 0;
  const allAnswered = visibleQuestions.every((q) => isAnswered(q, answers));

  const setAnswer = (qid: string, value: Answer) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const toggleMulti = (qid: string, cid: string) =>
    setAnswers((prev) => {
      const existing = Array.isArray(prev[qid]) ? (prev[qid] as string[]) : [];
      return {
        ...prev,
        [qid]: existing.includes(cid)
          ? existing.filter((c) => c !== cid)
          : [...existing, cid],
      };
    });

  const handleNext = async () => {
    if (!allAnswered) return;
    if (isLast) {
      try { await submit(answers); } catch { /* surfaced via submitError */ }
    } else {
      setStep((s) => s + 1);
    }
  };

  // ─── Guards ──────────────────────────────────────────────────────────────
  if (missingProduct) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <span className="text-4xl">🌸</span>
            <p className="mt-4 font-semibold">缺少 product 參數</p>
            <p className="mt-2 text-sm text-wh-ink-3">
              正確的 LIFF URL 應該包含：<br />
              <code className="text-wh-primary text-xs">?path=/q/{KEY}&amp;product=&lt;productId&gt;</code>
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex flex-col items-center justify-center gap-4">
          <span className="text-4xl animate-pulse">🌸</span>
          <p className="text-wh-ink-3 text-sm">載入問卷中...</p>
        </main>
      </div>
    );
  }

  if (specError || !meta || total === 0) {
    return (
      <div className={BG}>
        <main className="min-h-dvh flex items-center justify-center p-8 text-center">
          <div>
            <span className="text-4xl">🥀</span>
            <p className="mt-4 text-wh-primary font-medium">無法載入問卷</p>
            <p className="mt-1 text-sm text-wh-ink-3">{specError ?? '找不到題目'}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!started) {
    return (
      <div className={BG}>
        <BackgroundBlobs />
        <main className="relative z-[1] min-h-dvh max-w-xl mx-auto flex flex-col items-center text-center px-5 pt-20 pb-10 justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-wh-rose-tint to-wh-mauve-tint rounded-full flex items-center justify-center mb-6 shadow-[0_8px_28px_rgba(168,56,74,0.15)] animate-float-y">
              <Leaf size={40} className="text-wh-primary" strokeWidth={1.5} />
            </div>
            <div className="text-[10px] font-bold tracking-[2.5px] text-wh-secondary uppercase mb-2">
              Cofit · 女性保健
            </div>
            <h1 className="font-serif-wh text-[34px] leading-[1.22] text-wh-ink-1 mb-3.5">
              了解你的身體，<br />從<em className="text-wh-primary italic">今天</em>開始
            </h1>
            <p className="text-sm text-wh-ink-2 leading-[1.78] max-w-[280px] mx-auto mb-7">
              {meta.description ?? '透過 28 個問題了解你的週期、症狀與整體狀態，為你量身規劃女性健康計畫。'}
            </p>
            <div className="inline-flex items-center gap-[7px] bg-wh-rose-tint px-4 py-[7px] rounded-full text-xs font-semibold text-wh-primary mb-7">
              <Clock size={13} className="text-wh-primary" />
              約 5 分鐘完成
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="w-full"
          >
            <motion.button
              onClick={() => setStarted(true)}
              whileTap={{ scale: 0.97 }}
              className="w-full h-[52px] bg-gradient-to-br from-wh-primary to-wh-secondary text-white border-none rounded-full font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(168,56,74,0.28)] hover:shadow-[0_6px_24px_rgba(168,56,74,0.35)] active:scale-[0.97] transition-all duration-200"
            >
              開始了解我的身體
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        </main>
      </div>
    );
  }

  if (result) {
    return (
      <div className={BG}>
        <BackgroundBlobs />
        <main className="relative z-[1] min-h-dvh flex flex-col items-center justify-center gap-6 px-6 py-12 max-w-xl mx-auto">
          <span className="text-5xl">🌷</span>
          <div className="text-center">
            <h1 className="font-serif-wh text-3xl text-wh-ink-1">完成！</h1>
            <p className="mt-1 text-sm text-wh-ink-3">謝謝你的填答，我們會根據結果為你調整計畫 ✨</p>
          </div>
          <div className="w-full bg-white border border-wh-ink-5 rounded-2xl p-6 shadow-[0_1px_8px_rgba(42,26,31,0.06)]">
            {Object.keys(result.interpretation).length > 0 && (
              <ul className="flex flex-col gap-2 text-sm">
                {Object.entries(result.interpretation).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="text-wh-ink-3">{k}</span>
                    <span className="text-wh-ink-1 font-medium">{v}</span>
                  </li>
                ))}
              </ul>
            )}
            {Object.keys(result.scores).length > 0 && (
              <>
                {Object.keys(result.interpretation).length > 0 && (
                  <div className="my-4 border-t border-wh-ink-5" />
                )}
                <ul className="flex flex-col gap-2 text-sm">
                  {Object.entries(result.scores).map(([k, v]) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span className="text-wh-ink-3">{k}</span>
                      <span className="text-wh-primary font-semibold">{String(v)}</span>
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

  // ─── Main form: one section per page ─────────────────────────────────────
  return (
    <div className={BG}>
      <BackgroundBlobs />

      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] h-[3px] bg-wh-blush z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-wh-primary to-wh-accent rounded-r-sm"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>

      <button
        onClick={() => (safeStep > 0 ? setStep((s) => s - 1) : setStarted(false))}
        className="fixed top-3.5 left-[18px] w-9 h-9 bg-white/90 backdrop-blur-sm border-[1.5px] border-wh-ink-5 rounded-full flex items-center justify-center cursor-pointer z-50 shadow-[0_1px_8px_rgba(42,26,31,0.06)] hover:bg-white active:scale-95 transition-all"
        aria-label={safeStep === 0 ? '回到開始' : '上一頁'}
      >
        <ChevronLeft size={16} className="text-wh-ink-2" />
      </button>

      <div className="fixed top-5 right-[18px] text-xs font-medium text-wh-ink-3 z-50">
        {safeStep + 1} / {total}
      </div>

      <main className="relative z-[1] min-h-dvh max-w-xl mx-auto flex flex-col px-[22px] pt-[72px] pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSet.key}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="flex-1 flex flex-col"
          >
            <div className="text-[10px] font-bold tracking-[2.5px] text-wh-secondary uppercase mb-2">
              Step {safeStep + 1} · {currentSet.name}
            </div>
            {currentSet.description && (
              <p className="text-[13px] text-wh-ink-3 leading-[1.65] mb-6">{currentSet.description}</p>
            )}

            <div className="flex flex-col gap-6 mb-6">
              {visibleQuestions.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  answers={answers}
                  onSelect={(cid) => setAnswer(q.id, cid)}
                  onToggleMulti={(cid) => toggleMulti(q.id, cid)}
                  onSetText={(val) => setAnswer(q.id, val)}
                />
              ))}
            </div>

            {submitError && (
              <div className="mb-4 bg-wh-rose-tint border border-wh-blush text-wh-primary rounded-xl px-4 py-3 text-sm">
                {submitError}
              </div>
            )}

            <div className="mt-auto pt-5">
              <motion.button
                onClick={handleNext}
                disabled={!allAnswered || isSubmitting}
                whileTap={{ scale: 0.97 }}
                className="w-full h-[52px] bg-gradient-to-br from-wh-primary to-wh-secondary text-white border-none rounded-full font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_18px_rgba(168,56,74,0.28)] hover:shadow-[0_6px_24px_rgba(168,56,74,0.35)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isSubmitting ? '送出中...' : isLast ? '完成，看我的結果' : '下一頁'}
                {isLast && !isSubmitting && <ArrowRight size={16} />}
              </motion.button>
              {!allAnswered && (
                <p className="text-center text-xs text-wh-ink-3 mt-2">請完成這一頁的題目</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// ─── Question card (one question, any kind) ─────────────────────────────────

function QuestionCard({
  question,
  answers,
  onSelect,
  onToggleMulti,
  onSetText,
}: {
  question: Question;
  answers: Answers;
  onSelect: (choiceId: string) => void;
  onToggleMulti: (choiceId: string) => void;
  onSetText: (value: string) => void;
}) {
  const value = answers[question.id];

  return (
    <div className="flex flex-col gap-3">
      <p className="font-serif-wh text-[20px] leading-[1.35] text-wh-ink-1">{question.text}</p>
      {question.description && (
        <p className="text-[12px] text-wh-ink-3 leading-[1.6] -mt-1">{question.description}</p>
      )}
      <QuestionBody
        question={question}
        value={value}
        onSelect={onSelect}
        onToggleMulti={onToggleMulti}
        onSetText={onSetText}
      />
    </div>
  );
}

function QuestionBody({
  question,
  value,
  onSelect,
  onToggleMulti,
  onSetText,
}: {
  question: Question;
  value: Answer | undefined;
  onSelect: (choiceId: string) => void;
  onToggleMulti: (choiceId: string) => void;
  onSetText: (value: string) => void;
}) {
  // Likert 0–4 scale: detected by 5 choices with ids "0"–"4"
  if (isLikert(question)) {
    const choices = question.choices!;
    const minLabel = choices[0]?.label ?? '';
    const maxLabel = choices[choices.length - 1]?.label ?? '';
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between gap-2">
          {choices.map((c) => {
            const selected = value === c.id;
            return (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                whileTap={{ scale: 0.94 }}
                className={`flex-1 h-12 rounded-xl border-[1.5px] flex items-center justify-center font-semibold text-base transition-all duration-200 ${selected ? 'bg-gradient-to-br from-wh-primary to-wh-secondary text-white border-transparent shadow-[0_4px_12px_rgba(168,56,74,0.28)]' : 'bg-white border-wh-ink-5 text-wh-ink-3 hover:border-wh-ink-3'}`}
                aria-label={`${c.id} - ${c.label}`}
              >
                {c.id}
              </motion.button>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] text-wh-ink-3 px-1">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
        {typeof value === 'string' && value !== '' && (
          <p className="text-center text-[12px] text-wh-secondary font-medium mt-1">
            {choices.find((c) => c.id === value)?.label}
          </p>
        )}
      </div>
    );
  }

  if (question.kind === 'single_selection' && question.choices) {
    return (
      <div className="flex flex-col gap-[9px]">
        {question.choices.map((c) => (
          <OptionCard
            key={c.id}
            icon={ICONS[question.id]?.[c.id]}
            label={c.label}
            selected={value === c.id}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </div>
    );
  }

  if (question.kind === 'multiple_selection' && question.choices) {
    const isGrid = GRID_LAYOUT_QS.has(question.id);
    const selectedList = Array.isArray(value) ? value : [];
    return (
      <div className={isGrid ? 'grid grid-cols-2 gap-[9px]' : 'flex flex-col gap-[9px]'}>
        {question.choices.map((c) => (
          <OptionCard
            key={c.id}
            icon={ICONS[question.id]?.[c.id]}
            label={c.label}
            selected={selectedList.includes(c.id)}
            onClick={() => onToggleMulti(c.id)}
            layout={isGrid ? 'grid' : 'list'}
          />
        ))}
      </div>
    );
  }

  if (question.kind === 'date') {
    const v = typeof value === 'string' ? value : '';
    return (
      <div className="flex flex-col gap-3">
        {v && (
          <div className="text-center font-serif-wh text-[28px] text-wh-ink-1 leading-none">
            {formatDate(new Date(v))}
          </div>
        )}
        <input
          type="date"
          value={v}
          onChange={(e) => onSetText(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full h-14 border-2 border-wh-blush rounded-2xl px-[18px] text-base font-medium text-wh-ink-1 bg-white outline-none transition-all duration-200 focus:border-wh-secondary focus:shadow-[0_0_0_3px_var(--color-wh-rose-tint)]"
        />
      </div>
    );
  }

  if (question.kind === 'text') {
    return (
      <input
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onSetText(e.target.value)}
        maxLength={50}
        placeholder="請輸入"
        className="w-full h-14 border-2 border-wh-blush rounded-2xl px-[18px] text-base font-medium text-wh-ink-1 bg-white outline-none transition-all duration-200 focus:border-wh-secondary focus:shadow-[0_0_0_3px_var(--color-wh-rose-tint)] placeholder:text-wh-ink-3 placeholder:text-sm placeholder:font-normal"
      />
    );
  }

  if (question.kind === 'score') {
    return (
      <input
        type="number"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onSetText(e.target.value)}
        className="w-full h-14 border-2 border-wh-blush rounded-2xl px-[18px] text-base font-medium text-wh-ink-1 bg-white outline-none transition-all duration-200 focus:border-wh-secondary focus:shadow-[0_0_0_3px_var(--color-wh-rose-tint)]"
      />
    );
  }

  return null;
}

// ─── Option card (single/multi select with icon) ────────────────────────────

function OptionCard({
  icon: Icon,
  label,
  selected,
  onClick,
  layout = 'list',
}: {
  icon?: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
  layout?: 'list' | 'grid';
}) {
  const borderSelected = 'border-wh-secondary bg-wh-rose-pale';
  const ringBg = selected ? 'bg-wh-rose-tint' : 'bg-wh-ink-6';
  const iconColor = selected ? 'text-wh-secondary' : 'text-wh-ink-3';
  const labelColor = selected ? 'text-wh-primary' : 'text-wh-ink-1';

  if (layout === 'grid') {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        className={`flex flex-col items-center gap-2 p-4 bg-white border-[1.5px] rounded-2xl cursor-pointer text-center shadow-[0_1px_8px_rgba(42,26,31,0.06)] transition-all duration-200 ${selected ? borderSelected : 'border-wh-ink-5 hover:border-wh-ink-3'}`}
      >
        <span className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-200 ${ringBg}`}>
          {Icon ? <Icon size={20} className={iconColor} /> : <span className="w-2 h-2 rounded-full bg-current opacity-50" />}
        </span>
        <span className={`text-[13px] font-semibold transition-colors duration-200 ${labelColor}`}>{label}</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center gap-3.5 p-3.5 bg-white border-[1.5px] rounded-2xl cursor-pointer text-left shadow-[0_1px_8px_rgba(42,26,31,0.06)] transition-all duration-200 ${selected ? borderSelected : 'border-wh-ink-5 hover:border-wh-ink-3'}`}
    >
      <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-200 ${ringBg}`}>
        {Icon ? <Icon size={20} className={iconColor} /> : <span className="w-2 h-2 rounded-full bg-current opacity-50" />}
      </span>
      <span className="flex-1">
        <span className={`block text-sm font-semibold ${labelColor}`}>{label}</span>
      </span>
      <span className={`w-[22px] h-[22px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all duration-200 ${selected ? 'bg-wh-secondary border-wh-secondary' : 'border-wh-ink-5'}`}>
        <Check size={11} className={`text-white transition-opacity duration-200 ${selected ? 'opacity-100' : 'opacity-0'}`} />
      </span>
    </motion.button>
  );
}

function formatDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '請選擇日期';
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

function BackgroundBlobs() {
  return (
    <>
      <div className="fixed rounded-full blur-[80px] pointer-events-none z-0 w-[320px] h-[320px] bg-wh-blush opacity-45 -top-20 -right-[70px]" />
      <div className="fixed rounded-full blur-[80px] pointer-events-none z-0 w-[220px] h-[220px] bg-[#D4C5E0] opacity-30 bottom-[60px] -left-[60px]" />
      <div className="fixed rounded-full blur-[80px] pointer-events-none z-0 w-[160px] h-[160px] bg-[#C5DFD9] opacity-25 top-[45%] -right-5" />
    </>
  );
}
