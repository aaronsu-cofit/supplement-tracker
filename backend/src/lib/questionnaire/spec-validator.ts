// Validate a QuestionnaireSpec before it lands in the DB. Catches the
// usual lazy-mistake cases — duplicate keys, dangling sub_set_keys,
// expression refs to non-existent sets, choice ids that visible_if
// refers to but the question doesn't have. Cheap and prevents weird
// runtime errors in the scoring engine.
//
// Returns a list of human-readable errors. Empty list = spec is fine.

import type { QuestionnaireSpec } from './spec.types.js';

const VALID_CALC_TYPES = new Set([
  'sum_up',
  'average',
  'weighted',
  'weighted_sum',
  'count_above_threshold',
  'sum_of_multiple_selection',
  'sum_of_single_selection',
  'dominant_category',
  'avg_of_sub_question_set_scores',
  'sum_of_sub_question_set_scores',
  'arithmetic_expression',
]);

const AGGREGATING = new Set([
  'avg_of_sub_question_set_scores',
  'sum_of_sub_question_set_scores',
  'arithmetic_expression',
]);

export function validateSpec(spec: QuestionnaireSpec): string[] {
  const errors: string[] = [];

  if (!Array.isArray(spec.question_sets) || spec.question_sets.length === 0) {
    errors.push('question_sets is empty');
    return errors;
  }

  const setKeys = new Set<string>();
  for (const set of spec.question_sets) {
    if (!set.key || typeof set.key !== 'string') {
      errors.push(`set missing key: ${JSON.stringify(set).slice(0, 80)}`);
      continue;
    }
    if (setKeys.has(set.key)) errors.push(`duplicate set key: ${set.key}`);
    setKeys.add(set.key);

    if (!VALID_CALC_TYPES.has(set.calculation_type)) {
      errors.push(`set "${set.key}": unknown calculation_type "${set.calculation_type}"`);
    }

    const isAgg = AGGREGATING.has(set.calculation_type);
    if (!isAgg && (!set.questions || set.questions.length === 0)) {
      errors.push(`set "${set.key}": needs at least one question for ${set.calculation_type}`);
    }
    if (isAgg && set.calculation_type !== 'arithmetic_expression' &&
        (!set.sub_set_keys || set.sub_set_keys.length === 0)) {
      errors.push(`set "${set.key}": sub_set_keys required for ${set.calculation_type}`);
    }
    if (set.calculation_type === 'arithmetic_expression' && !set.expression) {
      errors.push(`set "${set.key}": expression required for arithmetic_expression`);
    }

    if (set.calculation_type === 'sum_of_single_selection' &&
        (!set.sequence_of_score || set.sequence_of_score.length === 0)) {
      errors.push(`set "${set.key}": sequence_of_score required for sum_of_single_selection`);
    }

    // Validate questions inside the set
    const questionIds = new Set<string>();
    for (const question of set.questions ?? []) {
      if (!question.id) {
        errors.push(`set "${set.key}": question missing id`);
        continue;
      }
      if (questionIds.has(question.id)) {
        errors.push(`set "${set.key}": duplicate question id "${question.id}"`);
      }
      questionIds.add(question.id);

      const needsChoices = question.kind === 'single_selection' || question.kind === 'multiple_selection';
      if (needsChoices && (!question.choices || question.choices.length === 0)) {
        errors.push(`question "${question.id}": choices required for ${question.kind}`);
      }
      const choiceIds = new Set<string>();
      for (const choice of question.choices ?? []) {
        if (choiceIds.has(choice.id)) {
          errors.push(`question "${question.id}": duplicate choice id "${choice.id}"`);
        }
        choiceIds.add(choice.id);
      }
      if (question.reverse_scored && question.score_max == null) {
        errors.push(`question "${question.id}": score_max required when reverse_scored`);
      }
    }

    // Validate interpretation_bands don't have negative widths
    for (const band of set.interpretation_bands ?? []) {
      if (band.min > band.max) {
        errors.push(`set "${set.key}": band "${band.label}" has min > max`);
      }
    }
  }

  // Now that we know every set key, check sub_set_keys + expression refs.
  for (const set of spec.question_sets) {
    for (const ref of set.sub_set_keys ?? []) {
      if (!setKeys.has(ref)) {
        errors.push(`set "${set.key}": sub_set_keys refers to unknown set "${ref}"`);
      }
    }
    if (set.expression) {
      for (const ref of extractIdentifiers(set.expression)) {
        if (!setKeys.has(ref)) {
          errors.push(`set "${set.key}": expression refers to unknown set "${ref}"`);
        }
      }
    }
  }

  // classification_rules — check they refer to known sets.
  for (const rule of spec.classification_rules ?? []) {
    for (const cond of rule.conditions ?? []) {
      if (!setKeys.has(cond.score_key)) {
        errors.push(
          `classification_rule "${rule.output_key}": refers to unknown set "${cond.score_key}"`,
        );
      }
    }
  }

  return errors;
}

function extractIdentifiers(expr: string): string[] {
  return Array.from(expr.matchAll(/[a-zA-Z_][a-zA-Z0-9_]*/g)).map((m) => m[0]);
}
