'use client';
// ╔══════════════════════════════════════════════════════════════════╗
// ║  EXAMPLE QUESTIONNAIRE PAGE — fork this to add your own.         ║
// ║                                                                  ║
// ║  Workflow:                                                       ║
// ║   1. In HQ, create a Questionnaire under a Product. Note the     ║
// ║      productId and key.                                          ║
// ║   2. Copy this folder to apps/questionnaires/src/app/q/<your_key>║
// ║   3. Replace PRODUCT_ID and KEY below.                           ║
// ║   4. Style/animate the rendering however you want — the three    ║
// ║      hooks handle spec fetch, submit, and anonymous_id.          ║
// ║   5. Deploy. Update liff_url in HQ to point at this page.        ║
// ╚══════════════════════════════════════════════════════════════════╝

import { useState } from 'react';
import { useQuestionnaireSpec } from '../../../hooks/useQuestionnaireSpec';
import { useSubmitResponse } from '../../../hooks/useSubmitResponse';
import type { Answers, Question } from '../../../types/spec';

// Replace these for each new questionnaire ────────────────────────────
const PRODUCT_ID = 'REPLACE_ME_PRODUCT_ID';
const KEY = 'example';

export default function ExampleQuestionnairePage() {
  const { meta, isLoading, error: specError } = useQuestionnaireSpec(PRODUCT_ID, KEY);
  const { submit, isSubmitting, error: submitError, result } = useSubmitResponse(PRODUCT_ID, KEY);
  const [answers, setAnswers] = useState<Answers>({});

  if (isLoading) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8 text-slate-500">
        載入問卷中...
      </main>
    );
  }
  if (specError || !meta) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-red-600 text-center">
          <p>無法載入問卷</p>
          <p className="text-sm text-slate-500 mt-1">{specError ?? '找不到此問卷'}</p>
        </div>
      </main>
    );
  }

  // Result screen — shown after successful submit.
  if (result) {
    return (
      <main className="min-h-dvh p-6 max-w-xl mx-auto flex flex-col gap-4">
        <h1 className="text-2xl font-bold">完成！</h1>
        <p className="text-slate-600">謝謝你的填答。</p>
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-semibold mb-2">分數</h2>
          <ul className="text-sm flex flex-col gap-1">
            {Object.entries(result.scores).map(([k, v]) => (
              <li key={k}>
                <code className="text-slate-500">{k}</code>: <strong>{String(v)}</strong>
              </li>
            ))}
          </ul>
          {Object.keys(result.interpretation).length > 0 && (
            <>
              <h2 className="font-semibold mt-3 mb-2">解讀</h2>
              <ul className="text-sm flex flex-col gap-1">
                {Object.entries(result.interpretation).map(([k, v]) => (
                  <li key={k}>
                    <code className="text-slate-500">{k}</code>: {v}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
    );
  }

  const onSelect = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choiceId }));
  };

  const onMultiToggle = (questionId: string, choiceId: string) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      return {
        ...prev,
        [questionId]: existing.includes(choiceId)
          ? existing.filter((c) => c !== choiceId)
          : [...existing, choiceId],
      };
    });
  };

  const onSubmit = async () => {
    try {
      await submit(answers);
    } catch {
      // error already surfaced via submitError
    }
  };

  return (
    <main className="min-h-dvh p-6 max-w-xl mx-auto flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">{meta.name}</h1>
        {meta.description && <p className="text-slate-600">{meta.description}</p>}
      </header>

      {meta.spec.question_sets.map((set) =>
        // Aggregating sets have no questions — skip their render block.
        !set.questions || set.questions.length === 0 ? null : (
          <section key={set.key} className="flex flex-col gap-4">
            <h2 className="font-semibold text-lg">{set.name}</h2>
            {set.questions.map((q) => (
              <QuestionView
                key={q.id}
                question={q}
                value={answers[q.id]}
                onSelect={(cid) => onSelect(q.id, cid)}
                onMultiToggle={(cid) => onMultiToggle(q.id, cid)}
              />
            ))}
          </section>
        ),
      )}

      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {submitError}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        className="bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg py-3 disabled:opacity-50"
      >
        {isSubmitting ? '送出中...' : '送出'}
      </button>
    </main>
  );
}

// ─── Question renderer ───────────────────────────────────────────────
// One simple presenter per kind. Vibe-coded forks usually replace this
// entirely with their own designed UI.

function QuestionView({
  question,
  value,
  onSelect,
  onMultiToggle,
}: {
  question: Question;
  value: string | string[] | number | undefined;
  onSelect: (choiceId: string) => void;
  onMultiToggle: (choiceId: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col gap-3">
      <p className="font-medium">{question.text}</p>

      {question.kind === 'single_selection' && question.choices && (
        <div className="flex flex-col gap-2">
          {question.choices.map((c) => (
            <label
              key={c.id}
              className={`border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                value === c.id
                  ? 'border-sky-500 bg-sky-50 text-sky-900'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                value={c.id}
                checked={value === c.id}
                onChange={() => onSelect(c.id)}
                className="mr-2"
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {question.kind === 'multiple_selection' && question.choices && (
        <div className="flex flex-col gap-2">
          {question.choices.map((c) => {
            const checked = Array.isArray(value) && value.includes(c.id);
            return (
              <label
                key={c.id}
                className={`border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  checked
                    ? 'border-sky-500 bg-sky-50 text-sky-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onMultiToggle(c.id)}
                  className="mr-2"
                />
                {c.label}
              </label>
            );
          })}
        </div>
      )}

      {question.kind === 'score' && (
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 w-full"
        />
      )}

      {question.kind === 'text' && (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 w-full"
        />
      )}

      {question.kind === 'date' && (
        <input
          type="date"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onSelect(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 w-full"
        />
      )}
    </div>
  );
}
