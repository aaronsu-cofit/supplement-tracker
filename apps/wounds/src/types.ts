// ─── Wound Domain ────────────────────────────────────────────────────────────

export interface WoundType {
  code: string;
  label: string;
  emoji: string;
  careNote: string;
}

export interface BodyLocation {
  code: string;
  label: string;
  emoji: string;
}

export type PhaseKey = 'inflammation' | 'proliferation' | 'remodeling' | 'mature';

export interface PhaseInfo {
  label: string;
  key: PhaseKey;
  color: string;
}

export interface Wound {
  id: number;
  name: string;
  wound_type: string;
  body_location: string | null;
  date_of_injury: string | null;
  display_name?: string | null;
  picture_url?: string | null;
  logs?: WoundLog[];
}

export interface WoundLog {
  id: number | string;
  logged_at: string;
  date?: string;
  nrs_pain_score: number;
  symptoms: string | null;
  ai_assessment_summary: string | null;
  ai_status_label: string | null;
  image_data?: string | null;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminPatient {
  id: string | number;
  name: string;
  picture_url: string | null;
  wound_id: string | number;
  surgery_date: string | null;
  latest_log: WoundLog | null;
  history: WoundLog[];
}
