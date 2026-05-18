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
import { FLOWERS, type FlowerKey } from './content';

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
  // Sets whose key starts with `score_` are scoring-only — they exist in
  // the spec for classification_rules to reference but should never be
  // rendered as a page.
  const visibleSets = useMemo(
    () =>
      sets.filter(
        (s) =>
          !s.key.startsWith('score_') &&
          (s.questions ?? []).some((q) => isVisible(q, answers)),
      ),
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
    const flowerKey = (result.interpretation.flower_type ?? '') as FlowerKey;

    // Ineligible: Q3 not in 'having_period' (menopause / pregnant / etc).
    // Show a calm "consult a specialist" screen rather than the rich flower
    // layout, because none of the cycle-based content applies.
    if (flowerKey === 'ineligible' || !(flowerKey in FLOWERS)) {
      return (
        <div className={BG}>
          <BackgroundBlobs />
          <main className="relative z-[1] min-h-dvh flex flex-col items-center justify-center gap-5 px-6 py-12 max-w-xl mx-auto text-center">
            <Stethoscope size={48} className="text-wh-ink-3" strokeWidth={1.5} />
            <div>
              <p className="text-[10px] font-bold tracking-[2.5px] text-wh-secondary uppercase mb-2">
                目前狀態
              </p>
              <h1 className="font-serif-wh text-[28px] leading-[1.28] text-wh-ink-1 mb-3">
                暫不適用此分型
              </h1>
              <p className="text-sm text-wh-ink-2 leading-[1.85] max-w-[320px] mx-auto">
                你目前的生理狀態（停經 / 懷孕 / 哺乳 / 手術後等）需要不同的健康評估方式，
                建議與專業醫師討論最適合你的保健方向。
              </p>
            </div>
          </main>
        </div>
      );
    }

    const f = FLOWERS[flowerKey];
    return (
      <div className={BG}>
        <BackgroundBlobs />
        <main className="relative z-[1] max-w-xl mx-auto px-5 pt-12 pb-16 flex flex-col gap-6">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center gap-3"
          >
            <span className="text-[72px] leading-none animate-float-y">{f.emoji}</span>
            <div>
              <p className={`text-[10px] font-bold tracking-[2.5px] uppercase mb-1 ${f.accent.text}`}>
                你的分型
              </p>
              <h1 className="font-serif-wh text-[36px] leading-[1.15] text-wh-ink-1">
                {f.shortName}
              </h1>
              <p className={`text-sm font-medium mt-1 ${f.accent.text}`}>· {f.subtitle}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {f.hashtags.map((tag) => (
                <span
                  key={tag}
                  className={`text-[11px] font-medium px-3 py-1 rounded-full ${f.accent.bgTint} ${f.accent.text}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.section>

          {/* Description */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white border border-wh-ink-5 rounded-2xl p-5 shadow-[0_1px_8px_rgba(42,26,31,0.06)]"
          >
            <p className="text-[14px] text-wh-ink-2 leading-[1.85]">{f.description}</p>
          </motion.section>

          {/* Manifestations */}
          <ResultSection title="常見表現" delay={0.2} accentText={f.accent.text}>
            <ol className="flex flex-col gap-2.5">
              {f.manifestations.map((item, i) => (
                <li key={i} className="flex gap-3 text-[14px] text-wh-ink-2 leading-[1.6]">
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${f.accent.bg}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 pt-0.5">{item}</span>
                </li>
              ))}
            </ol>
          </ResultSection>

          {/* Mechanism */}
          <ResultSection title="可能機轉" delay={0.25} accentText={f.accent.text}>
            <p className="text-[14px] text-wh-ink-2 leading-[1.85]">{f.mechanism}</p>
          </ResultSection>

          {/* Key message — highlight banner */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className={`rounded-2xl p-5 border-l-4 ${f.accent.border} ${f.accent.bgTint}`}
          >
            <p className="flex items-start gap-2 text-[14px] text-wh-ink-1 leading-[1.78] font-medium">
              <Sparkles className={`shrink-0 mt-0.5 ${f.accent.text}`} size={16} />
              <span>{f.keyMessage}</span>
            </p>
          </motion.section>

          {/* Tabbed actions — Nutrients / Diet / Lifestyle in one swipeable card */}
          <ActionsTabs flower={f} delay={0.35} />
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

      <div className="fixed top-5 right-[18px] text-xs font-medium text-wh-ink-3 z-50">
        第 {safeStep + 1} 頁 · 共 {total} 頁
      </div>

      <main className="relative z-[1] min-h-dvh max-w-xl mx-auto flex flex-col px-[22px] pt-[42px] pb-10">
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

            <div className="mt-auto pt-5 flex flex-col gap-2">
              <div className="flex gap-3">
                <motion.button
                  onClick={() => (safeStep > 0 ? setStep((s) => s - 1) : setStarted(false))}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 h-[52px] bg-white border-[1.5px] border-wh-ink-5 text-wh-ink-2 rounded-full font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-1 hover:border-wh-ink-3 active:scale-[0.97] transition-all duration-200"
                >
                  <ChevronLeft size={16} />
                  上一頁
                </motion.button>
                <motion.button
                  onClick={handleNext}
                  disabled={!allAnswered || isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 h-[52px] bg-gradient-to-br from-wh-primary to-wh-secondary text-white border-none rounded-full font-semibold text-[15px] cursor-pointer flex items-center justify-center gap-1 shadow-[0_4px_18px_rgba(168,56,74,0.28)] hover:shadow-[0_6px_24px_rgba(168,56,74,0.35)] active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {isSubmitting ? '送出中...' : isLast ? '完成' : '下一頁'}
                  {!isSubmitting && <ArrowRight size={16} />}
                </motion.button>
              </div>
              {!allAnswered && (
                <p className="text-center text-xs text-wh-ink-3 mt-1">請完成這一頁的題目</p>
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

// Tabbed swipeable card for the 3 action sections (nutrients / diet /
// lifestyle). Users tap a tab OR horizontally swipe within the content
// area to switch. Threshold is intentionally high (80px) so vertical
// scroll doesn't trigger accidental tab changes.
function ActionsTabs({
  flower,
  delay,
}: {
  flower: import('./content').FlowerContent;
  delay: number;
}) {
  const [active, setActive] = useState(0);
  const tabs = [
    { label: '建議營養素', key: 'nutrients' as const },
    { label: '飲食方向', key: 'diet' as const },
    { label: '生活作息', key: 'lifestyle' as const },
  ];

  const go = (dir: -1 | 1) => {
    const next = active + dir;
    if (next >= 0 && next < tabs.length) setActive(next);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col gap-3"
    >
      {/* Tab strip */}
      <div className="flex border-b border-wh-ink-5">
        {tabs.map((t, i) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(i)}
            className={`flex-1 py-3 text-[13px] font-semibold transition-all duration-200 -mb-px border-b-2 ${
              active === i
                ? `${flower.accent.text} ${flower.accent.border}`
                : 'text-wh-ink-3 border-transparent hover:text-wh-ink-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Swipeable content */}
      <div className="overflow-hidden touch-pan-y">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -80) go(1);
            else if (info.offset.x > 80) go(-1);
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tabs[active].key}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="pt-3 pb-2"
            >
              {tabs[active].key === 'nutrients' && (
                <div className="flex flex-col gap-2">
                  {flower.nutrients.map((n) => (
                    <div
                      key={n.name}
                      className="flex items-center gap-3 bg-white border border-wh-ink-5 rounded-xl px-3 py-2.5"
                    >
                      <span
                        className={`shrink-0 inline-flex items-center justify-center min-w-[68px] px-2.5 py-1 rounded-full text-[12px] font-semibold ${flower.accent.bg} text-white`}
                      >
                        {n.name}
                      </span>
                      <span className="text-[13px] text-wh-ink-2 leading-[1.5]">{n.reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {tabs[active].key === 'diet' && (
                <ul className="flex flex-col gap-2.5">
                  {flower.diet.map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[14px] text-wh-ink-2">
                      <Check className={`shrink-0 ${flower.accent.text}`} size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {tabs[active].key === 'lifestyle' && (
                <ul className="flex flex-col gap-2.5">
                  {flower.lifestyle.map((item, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[14px] text-wh-ink-2">
                      <Check className={`shrink-0 ${flower.accent.text}`} size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Dot pagination */}
      <div className="flex justify-center gap-1.5">
        {tabs.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              active === i ? `${flower.accent.bg} w-4` : 'bg-wh-ink-5 w-1.5'
            }`}
          />
        ))}
      </div>
    </motion.section>
  );
}

function ResultSection({
  title,
  delay,
  accentText,
  children,
}: {
  title: string;
  delay: number;
  accentText: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col gap-3"
    >
      <h2 className="text-[15px] font-bold text-wh-ink-1 flex items-center gap-2">
        <span className={accentText}>✦</span>
        {title}
      </h2>
      {children}
    </motion.section>
  );
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
