import { describe, it, expect } from 'vitest';
import { validateSpec } from './spec-validator.js';
import type { QuestionnaireSpec } from './spec.types.js';

describe('validateSpec', () => {
  it('accepts a minimal valid spec', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'phq',
          name: 'PHQ',
          calculation_type: 'sum_up',
          questions: [
            {
              id: 'q1',
              kind: 'single_selection',
              text: 'how do you feel?',
              choices: [
                { id: 'a', label: 'fine', score: 0 },
                { id: 'b', label: 'bad', score: 3 },
              ],
            },
          ],
        },
      ],
    };
    expect(validateSpec(spec)).toEqual([]);
  });

  it('rejects empty question_sets', () => {
    expect(validateSpec({ question_sets: [] })).toContain('question_sets is empty');
  });

  it('flags duplicate set keys', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        { key: 'x', name: 'a', calculation_type: 'sum_up', questions: [{ id: 'q', kind: 'score', text: '?' }] },
        { key: 'x', name: 'b', calculation_type: 'sum_up', questions: [{ id: 'q', kind: 'score', text: '?' }] },
      ],
    };
    expect(validateSpec(spec)).toContain('duplicate set key: x');
  });

  it('flags unknown calc type', () => {
    const spec = {
      question_sets: [
        // @ts-expect-error — testing runtime validation
        { key: 'x', name: 'x', calculation_type: 'bogus', questions: [] },
      ],
    } as QuestionnaireSpec;
    expect(validateSpec(spec).some((e) => e.includes('unknown calculation_type'))).toBe(true);
  });

  it('flags dangling sub_set_keys', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'overall',
          name: 'o',
          calculation_type: 'avg_of_sub_question_set_scores',
          sub_set_keys: ['anxiety', 'ghost'],
        },
        { key: 'anxiety', name: 'a', calculation_type: 'sum_up', questions: [{ id: 'q1', kind: 'score', text: '?' }] },
      ],
    };
    const errs = validateSpec(spec);
    expect(errs.some((e) => e.includes('"ghost"'))).toBe(true);
    expect(errs.some((e) => e.includes('"anxiety"'))).toBe(false);
  });

  it('flags expression refs to unknown sets', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'net',
          name: 'net',
          calculation_type: 'arithmetic_expression',
          expression: 'a + ghost',
        },
        { key: 'a', name: 'a', calculation_type: 'sum_up', questions: [{ id: 'q1', kind: 'score', text: '?' }] },
      ],
    };
    expect(validateSpec(spec).some((e) => e.includes('unknown set "ghost"'))).toBe(true);
  });

  it('flags reverse_scored without score_max', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        {
          key: 'x',
          name: 'x',
          calculation_type: 'sum_up',
          questions: [
            {
              id: 'q1',
              kind: 'single_selection',
              text: '?',
              choices: [{ id: 'a', label: 'a', score: 1 }],
              reverse_scored: true,
            },
          ],
        },
      ],
    };
    expect(validateSpec(spec).some((e) => e.includes('score_max required'))).toBe(true);
  });

  it('flags classification_rule referring to unknown set', () => {
    const spec: QuestionnaireSpec = {
      question_sets: [
        { key: 'a', name: 'a', calculation_type: 'sum_up', questions: [{ id: 'q1', kind: 'score', text: '?' }] },
      ],
      classification_rules: [
        {
          output_key: 'risk',
          output_label: 'high',
          conditions: [
            { score_key: 'a', op: 'gte', value: 5 },
            { score_key: 'ghost', op: 'gte', value: 5 },
          ],
        },
      ],
    };
    expect(validateSpec(spec).some((e) => e.includes('"ghost"'))).toBe(true);
  });
});
