// Questionnaire scoring engine — pure functions, no DB access.
// Consumed by services/questionnaire.service.ts to score a submission.
//
// Flow:
//   calculateAll(spec, answers) -> { scores, interpretation }
//                                          ↑          ↑
//   per-set dispatch to one of 11 ──────────┘          │
//   calc-type helpers below              after all set scores
//                                        are known, apply per-set
//                                        interpretation_bands and
//                                        top-level classification_rules.

import type {
  Answer,
  Answers,
  CalculationType,
  ClassificationRule,
  InterpretationBand,
  Interpretation,
  Question,
  QuestionSet,
  QuestionnaireSpec,
  Score,
  Scores,
  VisibleIf,
  VisibleIfClause,
} from './spec.types.js';

// ═════════════════════════════════════════════════════════════════
// Public API
// ═════════════════════════════════════════════════════════════════

/**
 * Compute every set score in dependency order, then apply
 * interpretation_bands + classification_rules.
 *
 * Aggregating sets (avg_of_sub_question_set_scores etc) and
 * arithmetic_expression sets depend on other set scores. We resolve
 * via repeated passes — each pass computes any set whose dependencies
 * are already known. Circular refs are detected and throw.
 */
export function calculateAll(
  spec: QuestionnaireSpec,
  answers: Answers,
): { scores: Scores; interpretation: Interpretation } {
  const scores: Scores = {};
  const remaining = new Set(spec.question_sets.map((s) => s.key));

  let progress = true;
  while (progress && remaining.size > 0) {
    progress = false;
    for (const set of spec.question_sets) {
      if (!remaining.has(set.key)) continue;
      if (!dependenciesResolved(set, scores)) continue;
      scores[set.key] = calculateSetScore(set, answers, scores);
      remaining.delete(set.key);
      progress = true;
    }
  }
  if (remaining.size > 0) {
    throw new Error(
      `Circular or unresolved set dependencies: ${[...remaining].join(', ')}`,
    );
  }

  const interpretation: Interpretation = {};
  for (const set of spec.question_sets) {
    if (!set.interpretation_bands) continue;
    const label = applyBands(scores[set.key], set.interpretation_bands);
    if (label !== undefined) interpretation[set.key] = label;
  }
  Object.assign(
    interpretation,
    applyClassificationRules(scores, spec.classification_rules),
  );

  return { scores, interpretation };
}

/**
 * Whether a question is visible (i.e. should be scored) given the
 * current answers. Used both by the scoring engine internally and
 * exposed for the LIFF frontend to drive show/hide.
 */
export function isVisible(question: Question, answers: Answers): boolean {
  if (!question.visible_if) return true;
  const clauses = clausesOf(question.visible_if);
  return clauses.every((c) => evaluateClause(c, answers));
}

/**
 * Compute one set's score. Exposed for unit tests; production code
 * should call calculateAll which handles dependency resolution.
 */
export function calculateSetScore(
  set: QuestionSet,
  answers: Answers,
  allSetScores: Scores,
): Score {
  switch (set.calculation_type) {
    case 'sum_up':
      return sumUp(set, answers);
    case 'average':
      return average(set, answers);
    case 'weighted':
      return weighted(set, answers);
    case 'weighted_sum':
      return weightedSum(set, answers);
    case 'count_above_threshold':
      return countAboveThreshold(set, answers);
    case 'sum_of_multiple_selection':
      return sumOfMultipleSelection(set, answers);
    case 'sum_of_single_selection':
      return sumOfSingleSelection(set, answers);
    case 'dominant_category':
      return dominantCategory(set, answers);
    case 'avg_of_sub_question_set_scores':
      return avgOfSubSets(set, allSetScores);
    case 'sum_of_sub_question_set_scores':
      return sumOfSubSets(set, allSetScores);
    case 'arithmetic_expression':
      return arithmeticExpression(set, allSetScores);
    default: {
      const _exhaustive: never = set.calculation_type;
      throw new Error(`Unknown calculation_type: ${_exhaustive}`);
    }
  }
}

// ═════════════════════════════════════════════════════════════════
// Visibility / dependency helpers
// ═════════════════════════════════════════════════════════════════

function clausesOf(v: VisibleIf): VisibleIfClause[] {
  return 'all' in v && Array.isArray((v as { all: unknown }).all)
    ? (v as { all: VisibleIfClause[] }).all
    : [v as VisibleIfClause];
}

function evaluateClause(clause: VisibleIfClause, answers: Answers): boolean {
  return Object.entries(clause).every(([qid, expected]) => {
    const actual = answers[qid];
    // NumericCondition?
    if (
      expected !== null &&
      typeof expected === 'object' &&
      !Array.isArray(expected)
    ) {
      const num = typeof actual === 'number' ? actual : Number(actual);
      if (Number.isNaN(num)) return false;
      if ('eq' in expected) return num === expected.eq;
      if ('gt' in expected) return num > expected.gt;
      if ('gte' in expected) return num >= expected.gte;
      if ('lt' in expected) return num < expected.lt;
      if ('lte' in expected) return num <= expected.lte;
      return false;
    }
    // string choice_id equality (also handles multi-select containing
    // the expected choice).
    if (Array.isArray(actual)) return actual.includes(expected as string);
    return actual === expected;
  });
}

function dependenciesResolved(set: QuestionSet, scores: Scores): boolean {
  const subs = set.sub_set_keys ?? [];
  if (!subs.every((k) => k in scores)) return false;
  if (set.expression) {
    return extractExpressionKeys(set.expression).every((k) => k in scores);
  }
  return true;
}

// ═════════════════════════════════════════════════════════════════
// Per-question helpers
// ═════════════════════════════════════════════════════════════════

function visibleAnsweredQuestions(set: QuestionSet, answers: Answers): Question[] {
  return (set.questions ?? []).filter((q) => {
    if (!isVisible(q, answers)) return false;
    const ans = answers[q.id];
    return ans !== undefined && ans !== null && ans !== '';
  });
}

/** Resolve the numeric score a question contributes, accounting for
 *  reverse_scored and multi-select sums. */
function getEffectiveScore(q: Question, ans: Answer): number {
  if (typeof ans === 'number') {
    return q.reverse_scored && q.score_max != null
      ? q.score_max - ans
      : ans;
  }
  if (typeof ans === 'string') {
    const choice = q.choices?.find((c) => c.id === ans);
    const base = choice?.score ?? 0;
    return q.reverse_scored && q.score_max != null
      ? q.score_max - base
      : base;
  }
  if (Array.isArray(ans)) {
    // multiple_selection: sum scores of all selected choices. Reverse
    // scoring is not meaningful for multi-select (no single answer to
    // invert) — applied per-choice would just flip every selection.
    return ans.reduce((sum, choiceId) => {
      const choice = q.choices?.find((c) => c.id === choiceId);
      return sum + (choice?.score ?? 0);
    }, 0);
  }
  return 0;
}

// ═════════════════════════════════════════════════════════════════
// Calc-type implementations
// ═════════════════════════════════════════════════════════════════

function sumUp(set: QuestionSet, answers: Answers): number {
  return visibleAnsweredQuestions(set, answers).reduce(
    (sum, q) => sum + getEffectiveScore(q, answers[q.id]),
    0,
  );
}

function average(set: QuestionSet, answers: Answers): number {
  const qs = visibleAnsweredQuestions(set, answers);
  if (qs.length === 0) return 0;
  const total = qs.reduce((s, q) => s + getEffectiveScore(q, answers[q.id]), 0);
  return roundTo(total / qs.length, 2);
}

/** Warehouse style: mean × 20, rounded to one decimal (gives 0-100). */
function weighted(set: QuestionSet, answers: Answers): number {
  const qs = visibleAnsweredQuestions(set, answers);
  if (qs.length === 0) return 0;
  const mean = qs.reduce((s, q) => s + getEffectiveScore(q, answers[q.id]), 0) / qs.length;
  return roundTo(mean * 20, 1);
}

function weightedSum(set: QuestionSet, answers: Answers): number {
  return visibleAnsweredQuestions(set, answers).reduce((sum, q) => {
    const w = q.weight ?? 1;
    return sum + getEffectiveScore(q, answers[q.id]) * w;
  }, 0);
}

function countAboveThreshold(set: QuestionSet, answers: Answers): number {
  const t = set.threshold ?? 1;
  return visibleAnsweredQuestions(set, answers).filter(
    (q) => getEffectiveScore(q, answers[q.id]) >= t,
  ).length;
}

function sumOfMultipleSelection(set: QuestionSet, answers: Answers): string {
  const counts = categoryCounts(set, answers);
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([cat, n]) => `${n}${cat}`)
    .join(' ');
}

function sumOfSingleSelection(set: QuestionSet, answers: Answers): string {
  const counts = categoryCounts(set, answers);
  const seq = set.sequence_of_score ?? Object.keys(counts);
  return seq.map((cat) => `${counts[cat] ?? 0}${cat}`).join(' ');
}

function dominantCategory(set: QuestionSet, answers: Answers): string {
  const counts = categoryCounts(set, answers);
  let best = '';
  let max = -1;
  for (const [cat, n] of Object.entries(counts)) {
    if (n > max) {
      best = cat;
      max = n;
    }
  }
  return best;
}

/** Count category occurrences across all visible answered questions in
 *  this set. Handles both single (string) and multi (string[]) answers. */
function categoryCounts(set: QuestionSet, answers: Answers): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const q of visibleAnsweredQuestions(set, answers)) {
    const ans = answers[q.id];
    const choiceIds = Array.isArray(ans) ? ans : typeof ans === 'string' ? [ans] : [];
    for (const id of choiceIds) {
      const choice = q.choices?.find((c) => c.id === id);
      const cat = choice?.category;
      if (cat) counts[cat] = (counts[cat] ?? 0) + 1;
    }
  }
  return counts;
}

function avgOfSubSets(set: QuestionSet, allScores: Scores): number {
  const subs = (set.sub_set_keys ?? [])
    .map((k) => allScores[k])
    .filter((s): s is number => typeof s === 'number');
  if (subs.length === 0) return 0;
  return roundTo(subs.reduce((a, b) => a + b, 0) / subs.length, 2);
}

function sumOfSubSets(set: QuestionSet, allScores: Scores): number {
  const subs = (set.sub_set_keys ?? [])
    .map((k) => allScores[k])
    .filter((s): s is number => typeof s === 'number');
  return roundTo(subs.reduce((a, b) => a + b, 0), 2);
}

// ═════════════════════════════════════════════════════════════════
// Safe arithmetic expression evaluator
// Supports: + - * / ( ) decimals, set-key identifiers (a-z 0-9 _).
// NO functions, NO variables outside set keys. Strict tokenizer +
// shunting yard so admin-authored specs can't escape into eval.
// ═════════════════════════════════════════════════════════════════

function arithmeticExpression(set: QuestionSet, allScores: Scores): number {
  if (!set.expression) return 0;
  return roundTo(evalExpr(set.expression, allScores), 2);
}

function extractExpressionKeys(expr: string): string[] {
  const out: string[] = [];
  for (const m of expr.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)) {
    out.push(m[0]);
  }
  return out;
}

type Token = { kind: 'num' | 'op' | 'lparen' | 'rparen' | 'id'; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ' || c === '\t' || c === '\n') {
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ kind: 'lparen', value: c });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ kind: 'rparen', value: c });
      i++;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/') {
      tokens.push({ kind: 'op', value: c });
      i++;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i;
      while (j < expr.length && ((expr[j] >= '0' && expr[j] <= '9') || expr[j] === '.')) j++;
      tokens.push({ kind: 'num', value: expr.slice(i, j) });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i;
      while (
        j < expr.length &&
        ((expr[j] >= 'a' && expr[j] <= 'z') ||
          (expr[j] >= 'A' && expr[j] <= 'Z') ||
          (expr[j] >= '0' && expr[j] <= '9') ||
          expr[j] === '_')
      )
        j++;
      tokens.push({ kind: 'id', value: expr.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Unexpected char '${c}' in expression at index ${i}`);
  }
  return tokens;
}

function evalExpr(expr: string, scores: Scores): number {
  // Shunting yard → RPN → evaluate.
  const tokens = tokenize(expr);
  const output: Token[] = [];
  const ops: Token[] = [];
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  for (const t of tokens) {
    if (t.kind === 'num' || t.kind === 'id') output.push(t);
    else if (t.kind === 'op') {
      while (
        ops.length > 0 &&
        ops[ops.length - 1].kind === 'op' &&
        prec[ops[ops.length - 1].value] >= prec[t.value]
      ) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t.kind === 'lparen') ops.push(t);
    else if (t.kind === 'rparen') {
      while (ops.length > 0 && ops[ops.length - 1].kind !== 'lparen') {
        output.push(ops.pop()!);
      }
      if (ops.length === 0) throw new Error('Mismatched parenthesis');
      ops.pop(); // discard lparen
    }
  }
  while (ops.length > 0) {
    const top = ops.pop()!;
    if (top.kind === 'lparen') throw new Error('Mismatched parenthesis');
    output.push(top);
  }
  const stack: number[] = [];
  for (const t of output) {
    if (t.kind === 'num') stack.push(parseFloat(t.value));
    else if (t.kind === 'id') {
      const v = scores[t.value];
      if (typeof v !== 'number') {
        throw new Error(`Expression refers to non-numeric or unknown set "${t.value}"`);
      }
      stack.push(v);
    } else if (t.kind === 'op') {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Malformed expression');
      switch (t.value) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero in expression');
          stack.push(a / b);
          break;
      }
    }
  }
  if (stack.length !== 1) throw new Error('Malformed expression');
  return stack[0];
}

// ═════════════════════════════════════════════════════════════════
// Post-processors
// ═════════════════════════════════════════════════════════════════

function applyBands(score: Score, bands: InterpretationBand[]): string | undefined {
  if (typeof score !== 'number') return undefined;
  for (const b of bands) {
    if (score >= b.min && score <= b.max) return b.label;
  }
  return undefined;
}

function applyClassificationRules(
  scores: Scores,
  rules?: ClassificationRule[],
): Interpretation {
  const out: Interpretation = {};
  if (!rules) return out;
  for (const rule of rules) {
    const ok = rule.conditions.every((c) => {
      const s = scores[c.score_key];
      if (typeof s !== 'number') return false;
      switch (c.op) {
        case 'gte':
          return s >= c.value;
        case 'gt':
          return s > c.value;
        case 'lte':
          return s <= c.value;
        case 'lt':
          return s < c.value;
        case 'eq':
          return s === c.value;
      }
    });
    if (ok) out[rule.output_key] = rule.output_label;
  }
  return out;
}

function roundTo(n: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(n * factor) / factor;
}

// Re-export so callers don't need to import CalculationType in two places.
export type {
  CalculationType,
  QuestionnaireSpec,
  Answers,
  Scores,
  Score,
  Interpretation,
};
