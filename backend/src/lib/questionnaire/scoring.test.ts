import { describe, it, expect } from 'vitest';
import { calculateAll, calculateSetScore, isVisible } from './scoring.js';
import type { Question, QuestionSet, QuestionnaireSpec } from './spec.types.js';

// Helpers to keep specs short and readable in tests.
function q(
  id: string,
  text: string,
  scores: Record<string, number>,
  extras: Partial<Question> = {},
): Question {
  return {
    id,
    kind: 'single_selection',
    text,
    choices: Object.entries(scores).map(([cid, score]) => ({ id: cid, label: cid, score })),
    ...extras,
  };
}

function multiQ(
  id: string,
  text: string,
  options: Array<{ id: string; category: string; score?: number }>,
): Question {
  return {
    id,
    kind: 'multiple_selection',
    text,
    choices: options.map((o) => ({ id: o.id, label: o.id, category: o.category, score: o.score })),
  };
}

describe('scoring — numeric calc types', () => {
  it('sum_up: adds visible answered question scores', () => {
    const set: QuestionSet = {
      key: 'phq',
      name: 'PHQ',
      calculation_type: 'sum_up',
      questions: [
        q('q1', 'q1', { a: 0, b: 1, c: 2 }),
        q('q2', 'q2', { a: 0, b: 1, c: 2 }),
        q('q3', 'q3', { a: 0, b: 1, c: 2 }),
      ],
    };
    expect(calculateSetScore(set, { q1: 'c', q2: 'b', q3: 'a' }, {})).toBe(3);
  });

  it('sum_up: skipped questions do not contribute', () => {
    const set: QuestionSet = {
      key: 'phq',
      name: 'PHQ',
      calculation_type: 'sum_up',
      questions: [q('q1', 'q1', { a: 0, b: 2 }), q('q2', 'q2', { a: 0, b: 2 })],
    };
    expect(calculateSetScore(set, { q1: 'b' }, {})).toBe(2);
  });

  it('average: divides by visible answered count', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'average',
      questions: [q('q1', '', { a: 4 }), q('q2', '', { a: 6 }), q('q3', '', { a: 2 })],
    };
    expect(calculateSetScore(set, { q1: 'a', q2: 'a', q3: 'a' }, {})).toBe(4);
  });

  it('weighted: mean × 20 rounded to one decimal', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'weighted',
      questions: [q('q1', '', { a: 3 }), q('q2', '', { a: 4 })],
    };
    // mean = 3.5 × 20 = 70
    expect(calculateSetScore(set, { q1: 'a', q2: 'a' }, {})).toBe(70);
  });

  it('weighted_sum: applies per-question weight (default 1)', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'weighted_sum',
      questions: [
        q('q1', '', { a: 2 }, { weight: 3 }), // 2 × 3
        q('q2', '', { a: 4 }), // 4 × 1
      ],
    };
    expect(calculateSetScore(set, { q1: 'a', q2: 'a' }, {})).toBe(10);
  });

  it('count_above_threshold: counts items ≥ threshold', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'count_above_threshold',
      threshold: 2,
      questions: [
        q('q1', '', { a: 1, b: 2, c: 3 }),
        q('q2', '', { a: 1, b: 2, c: 3 }),
        q('q3', '', { a: 1, b: 2, c: 3 }),
      ],
    };
    expect(calculateSetScore(set, { q1: 'c', q2: 'b', q3: 'a' }, {})).toBe(2);
  });
});

describe('scoring — reverse_scored', () => {
  it('inverts answer using score_max', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'sum_up',
      questions: [
        // "I sleep well" — positive item, reverse it
        q('q1', '', { a: 0, b: 1, c: 2, d: 3, e: 4 }, { reverse_scored: true, score_max: 4 }),
      ],
    };
    // Answer 'e' (score 4) reverses to 0
    expect(calculateSetScore(set, { q1: 'e' }, {})).toBe(0);
    // Answer 'a' (score 0) reverses to 4
    expect(calculateSetScore(set, { q1: 'a' }, {})).toBe(4);
  });
});

describe('scoring — categorical calc types', () => {
  it('sum_of_multiple_selection: only present categories', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'sum_of_multiple_selection',
      questions: [
        multiQ('q1', '', [
          { id: 'a', category: 'L' },
          { id: 'b', category: 'P' },
          { id: 'c', category: 'L' },
        ]),
        multiQ('q2', '', [
          { id: 'a', category: 'P' },
          { id: 'b', category: 'L' },
        ]),
      ],
    };
    // q1 → L,P,L; q2 → L
    // Counts: L=3, P=1
    const result = calculateSetScore(set, { q1: ['a', 'b', 'c'], q2: ['b'] }, {}) as string;
    expect(result.split(' ').sort()).toEqual(['1P', '3L'].sort());
  });

  it('sum_of_single_selection: pads with sequence_of_score', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'sum_of_single_selection',
      sequence_of_score: ['T', 'C', 'L', 'E', 'A'],
      questions: [
        q('q1', '', {}, { choices: [{ id: 'a', label: 'a', category: 'T' }] }),
        q('q2', '', {}, { choices: [{ id: 'a', label: 'a', category: 'L' }] }),
        q('q3', '', {}, { choices: [{ id: 'a', label: 'a', category: 'L' }] }),
      ],
    };
    expect(calculateSetScore(set, { q1: 'a', q2: 'a', q3: 'a' }, {})).toBe('1T 0C 2L 0E 0A');
  });

  it('dominant_category: returns single most-voted category', () => {
    const set: QuestionSet = {
      key: 's',
      name: 's',
      calculation_type: 'dominant_category',
      questions: [
        q('q1', '', {}, { choices: [{ id: 'a', label: 'a', category: 'I' }] }),
        q('q2', '', {}, { choices: [{ id: 'a', label: 'a', category: 'E' }] }),
        q('q3', '', {}, { choices: [{ id: 'a', label: 'a', category: 'I' }] }),
      ],
    };
    expect(calculateSetScore(set, { q1: 'a', q2: 'a', q3: 'a' }, {})).toBe('I');
  });
});

describe('scoring — aggregation', () => {
  it('avg_of_sub_question_set_scores: averages numeric sub scores', () => {
    const set: QuestionSet = {
      key: 'overall',
      name: 'overall',
      calculation_type: 'avg_of_sub_question_set_scores',
      sub_set_keys: ['anxiety', 'depression', 'sleep'],
    };
    expect(calculateSetScore(set, {}, { anxiety: 8, depression: 12, sleep: 6 })).toBe(8.67);
  });

  it('sum_of_sub_question_set_scores: sums numeric sub scores', () => {
    const set: QuestionSet = {
      key: 'overall',
      name: 'overall',
      calculation_type: 'sum_of_sub_question_set_scores',
      sub_set_keys: ['anxiety', 'sleep'],
    };
    expect(calculateSetScore(set, {}, { anxiety: 8, sleep: 6 })).toBe(14);
  });
});

describe('scoring — arithmetic_expression', () => {
  it('evaluates basic formula', () => {
    const set: QuestionSet = {
      key: 'net',
      name: 'net',
      calculation_type: 'arithmetic_expression',
      expression: '(anxiety + depression) / 2 - resilience',
    };
    expect(calculateSetScore(set, {}, { anxiety: 10, depression: 6, resilience: 2 })).toBe(6);
  });

  it('throws on division by zero', () => {
    const set: QuestionSet = {
      key: 'net',
      name: 'net',
      calculation_type: 'arithmetic_expression',
      expression: 'a / b',
    };
    expect(() => calculateSetScore(set, {}, { a: 1, b: 0 })).toThrow(/Division by zero/);
  });

  it('throws on unknown identifier', () => {
    const set: QuestionSet = {
      key: 'x',
      name: 'x',
      calculation_type: 'arithmetic_expression',
      expression: 'a + ghost',
    };
    expect(() => calculateSetScore(set, {}, { a: 1 })).toThrow(/unknown set/);
  });
});

describe('isVisible — branching', () => {
  it('returns true when no visible_if', () => {
    expect(isVisible(q('q1', '', { a: 1 }), {})).toBe(true);
  });

  it('single-clause equality', () => {
    const target = q('q2', '', { a: 1 }, { visible_if: { q1: 'yes' } });
    expect(isVisible(target, { q1: 'yes' })).toBe(true);
    expect(isVisible(target, { q1: 'no' })).toBe(false);
  });

  it('multi-clause AND', () => {
    const target = q(
      'q3',
      '',
      { a: 1 },
      { visible_if: { all: [{ q1: 'yes' }, { age: { gte: 18 } }] } },
    );
    expect(isVisible(target, { q1: 'yes', age: 20 })).toBe(true);
    expect(isVisible(target, { q1: 'yes', age: 16 })).toBe(false);
    expect(isVisible(target, { q1: 'no', age: 20 })).toBe(false);
  });

  it('numeric conditions', () => {
    const target = q('q2', '', { a: 1 }, { visible_if: { score: { gt: 5 } } });
    expect(isVisible(target, { score: 6 })).toBe(true);
    expect(isVisible(target, { score: 5 })).toBe(false);
  });

  it('multi-select containing the expected choice counts as match', () => {
    const target = q('q2', '', { a: 1 }, { visible_if: { q1: 'yes' } });
    expect(isVisible(target, { q1: ['maybe', 'yes'] })).toBe(true);
    expect(isVisible(target, { q1: ['no'] })).toBe(false);
  });
});

describe('calculateAll — orchestrator + post-processors', () => {
  it('computes dependent sets in topological order', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        // Aggregation listed first to ensure topo sort works
        {
          key: 'overall',
          name: 'overall',
          calculation_type: 'avg_of_sub_question_set_scores',
          sub_set_keys: ['a', 'b'],
        },
        { key: 'a', name: 'a', calculation_type: 'sum_up', questions: [q('q1', '', { x: 4 })] },
        { key: 'b', name: 'b', calculation_type: 'sum_up', questions: [q('q2', '', { x: 6 })] },
      ],
    };
    const result = calculateAll(spec, { q1: 'x', q2: 'x' });
    expect(result.scores).toEqual({ a: 4, b: 6, overall: 5 });
  });

  it('throws on circular dependencies', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'a',
          name: 'a',
          calculation_type: 'avg_of_sub_question_set_scores',
          sub_set_keys: ['b'],
        },
        {
          key: 'b',
          name: 'b',
          calculation_type: 'avg_of_sub_question_set_scores',
          sub_set_keys: ['a'],
        },
      ],
    };
    expect(() => calculateAll(spec, {})).toThrow(/Circular/);
  });

  it('applies interpretation_bands per set', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'phq',
          name: 'phq',
          calculation_type: 'sum_up',
          questions: [q('q1', '', { a: 0, b: 5, c: 10 })],
          interpretation_bands: [
            { min: 0, max: 4, label: '正常' },
            { min: 5, max: 9, label: '輕度' },
            { min: 10, max: 30, label: '中度' },
          ],
        },
      ],
    };
    expect(calculateAll(spec, { q1: 'b' }).interpretation).toEqual({ phq: '輕度' });
    expect(calculateAll(spec, { q1: 'c' }).interpretation).toEqual({ phq: '中度' });
  });

  it('applies classification_rules across dimensions', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        { key: 'anxiety', name: 'a', calculation_type: 'sum_up', questions: [q('q1', '', { a: 12 })] },
        { key: 'mood', name: 'm', calculation_type: 'sum_up', questions: [q('q2', '', { a: 9 })] },
      ],
      classification_rules: [
        {
          output_key: 'risk',
          output_label: '建議轉介',
          conditions: [
            { score_key: 'anxiety', op: 'gte', value: 10 },
            { score_key: 'mood', op: 'gte', value: 8 },
          ],
        },
      ],
    };
    expect(calculateAll(spec, { q1: 'a', q2: 'a' }).interpretation).toEqual({
      risk: '建議轉介',
    });
  });

  it('skips classification_rule when any condition fails', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        { key: 'a', name: 'a', calculation_type: 'sum_up', questions: [q('q1', '', { a: 12 })] },
        { key: 'b', name: 'b', calculation_type: 'sum_up', questions: [q('q2', '', { a: 3 })] },
      ],
      classification_rules: [
        {
          output_key: 'risk',
          output_label: 'high',
          conditions: [
            { score_key: 'a', op: 'gte', value: 10 },
            { score_key: 'b', op: 'gte', value: 8 }, // fails
          ],
        },
      ],
    };
    expect(calculateAll(spec, { q1: 'a', q2: 'a' }).interpretation).toEqual({});
  });
});
