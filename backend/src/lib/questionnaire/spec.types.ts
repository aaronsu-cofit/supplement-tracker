// Questionnaire spec types — the JSON shape stored in
// Questionnaire.spec, consumed by the scoring engine and by the LIFF
// frontend.
//
// Design notes (see backend/docs/questionnaire-spec.md for the full
// authoring guide, added separately):
//   - Sets are the unit of scoring. Each set has one calculation_type.
//   - Questions live inside sets (except aggregation sets which only
//     reference other sets via sub_set_keys / expression).
//   - Branching is per-question via visible_if. Invisible questions
//     are skipped during scoring.
//   - reverse_scored + weight + score_max live on Question, not Choice,
//     so the same choice set can be reused across questions with
//     different polarity.
//   - score (number) and category (string) are separate fields on
//     Choice — never mixed, unlike warehouse's Choice.score.

export type QuestionKind =
  | 'single_selection'
  | 'multiple_selection'
  | 'score' // free-form numeric input (e.g. NRS 0-10)
  | 'text' // metadata only — not scored
  | 'date'; // metadata only — not scored

export type CalculationType =
  // Numeric, per-question scoring
  | 'sum_up'
  | 'average'
  | 'weighted' // mean × 20 (warehouse style: 0-100)
  | 'weighted_sum' // sum(score × per-question weight)
  | 'count_above_threshold'
  // Categorical, per-question
  | 'sum_of_multiple_selection' // "2L 1P" — only present categories
  | 'sum_of_single_selection' // "0T 1C 2L 0E" — sequence_of_score padded
  | 'dominant_category' // "L" — single most-voted category
  // Aggregations across sets
  | 'avg_of_sub_question_set_scores'
  | 'sum_of_sub_question_set_scores'
  // Escape hatch
  | 'arithmetic_expression';

export type NumericCondition =
  | { eq: number }
  | { gt: number }
  | { gte: number }
  | { lt: number }
  | { lte: number };

// A single clause: every key→value must hold (implicit AND).
// Value is a choice_id (string equality) or a NumericCondition.
export type VisibleIfClause = { [questionId: string]: string | NumericCondition };

// Either a single clause, or { all: [clause, clause, ...] }.
// Multi-clause form is just for readability — also AND.
export type VisibleIf = VisibleIfClause | { all: VisibleIfClause[] };

export interface Choice {
  id: string;
  label: string;
  /** Numeric score contribution. Required for numeric calc types. */
  score?: number;
  /** Category code for categorical calc types (e.g. 'L', 'P', 'T'). */
  category?: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  description?: string;
  /** Required when kind is single_selection or multiple_selection. */
  choices?: Choice[];
  /** Skip-logic: question only shown / scored when this evaluates true. */
  visible_if?: VisibleIf;
  /** If true, effective score becomes (score_max - choice.score). */
  reverse_scored?: boolean;
  /** Per-question weight for weighted_sum. Defaults to 1. */
  weight?: number;
  /** Per-question maximum score. Used by reverse scoring + percentage. */
  score_max?: number;
  /** UI hint — does not affect scoring. */
  required?: boolean;
}

export interface InterpretationBand {
  /** Inclusive lower bound. */
  min: number;
  /** Inclusive upper bound. */
  max: number;
  label: string;
}

export interface QuestionSet {
  /** Stable slug, referenced in scores and from other sets. */
  key: string;
  name: string;
  description?: string;
  calculation_type: CalculationType;

  /** Required for non-aggregating types. */
  questions?: Question[];

  /** For avg_of_sub_question_set_scores / sum_of_sub_question_set_scores. */
  sub_set_keys?: string[];

  /** For arithmetic_expression. Refers to other set keys.
   *  Safe subset: + - * / ( ) and decimal numbers. No functions.
   *  Example: "(anxiety + depression) / 2 - resilience". */
  expression?: string;

  /** For sum_of_single_selection — output order with zero padding. */
  sequence_of_score?: string[];

  /** For count_above_threshold. Default 1. */
  threshold?: number;

  /** Per-set score → text label mapping. Numeric scores only. */
  interpretation_bands?: InterpretationBand[];
}

export interface ClassificationRule {
  /** Key to write into interpretation.{output_key}. */
  output_key: string;
  output_label: string;
  /** Every condition must hold (AND). */
  conditions: Array<{
    score_key: string; // refers to a QuestionSet.key whose score is numeric
    op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
    value: number;
  }>;
}

export interface QuestionnaireSpec {
  question_sets: QuestionSet[];
  /** Optional multi-dimension classifications, evaluated after all
   *  set scores are computed. */
  classification_rules?: ClassificationRule[];
}

// ─── Answer / Score shapes ────────────────────────────────────────────

export type Answer = string | string[] | number;

export type Answers = { [questionId: string]: Answer };

/** A score is numeric (sum_up, average, ...) or string (categorical). */
export type Score = number | string;

export type Scores = { [setKey: string]: Score };

export type Interpretation = { [key: string]: string };
