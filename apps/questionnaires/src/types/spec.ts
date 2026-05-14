// Mirror of backend/src/lib/questionnaire/spec.types.ts.
//
// Kept in sync by hand — the schema is small and changes rarely.
// If you change one, change the other. Tests don't cross app
// boundaries so divergence will only show up at runtime.

export type QuestionKind =
  | 'single_selection'
  | 'multiple_selection'
  | 'score'
  | 'text'
  | 'date';

export type CalculationType =
  | 'sum_up'
  | 'average'
  | 'weighted'
  | 'weighted_sum'
  | 'count_above_threshold'
  | 'sum_of_multiple_selection'
  | 'sum_of_single_selection'
  | 'dominant_category'
  | 'avg_of_sub_question_set_scores'
  | 'sum_of_sub_question_set_scores'
  | 'arithmetic_expression';

export type NumericCondition =
  | { eq: number }
  | { gt: number }
  | { gte: number }
  | { lt: number }
  | { lte: number };

export type VisibleIfClause = { [questionId: string]: string | NumericCondition };
export type VisibleIf = VisibleIfClause | { all: VisibleIfClause[] };

export interface Choice {
  id: string;
  label: string;
  score?: number;
  category?: string;
}

export interface Question {
  id: string;
  kind: QuestionKind;
  text: string;
  description?: string;
  choices?: Choice[];
  visible_if?: VisibleIf;
  reverse_scored?: boolean;
  weight?: number;
  score_max?: number;
  required?: boolean;
}

export interface InterpretationBand {
  min: number;
  max: number;
  label: string;
}

export interface QuestionSet {
  key: string;
  name: string;
  description?: string;
  calculation_type: CalculationType;
  questions?: Question[];
  sub_set_keys?: string[];
  expression?: string;
  sequence_of_score?: string[];
  threshold?: number;
  interpretation_bands?: InterpretationBand[];
}

export interface QuestionnaireSpec {
  question_sets: QuestionSet[];
  classification_rules?: Array<{
    output_key: string;
    output_label: string;
    conditions: Array<{
      score_key: string;
      op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq';
      value: number;
    }>;
  }>;
}

// What GET /spec returns (the questionnaire shell + spec).
export interface QuestionnaireMeta {
  id: string;
  key: string;
  name: string;
  description: string | null;
  spec: QuestionnaireSpec;
  liff_url: string | null;
}

export type Answer = string | string[] | number;
export type Answers = { [questionId: string]: Answer };

export interface SubmitResult {
  id: string;
  scores: Record<string, number | string>;
  interpretation: Record<string, string>;
  triggered_actions: Array<{ type: string; ok: boolean; reason?: string }>;
}
