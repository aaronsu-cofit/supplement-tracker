// ─── Foot Care ────────────────────────────────────────────────────────────────

export type FootSeverity = 'normal' | 'mild' | 'moderate' | 'severe';
export type ShoeRiskLevel = 'low' | 'moderate' | 'high';
export type ShoeWearPattern =
  | 'medial_forefoot'
  | 'lateral'
  | 'heel_center'
  | 'toe_asymmetric'
  | 'uniform'
  | 'mixed'
  | string;

export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface ToeDetection {
  detected: boolean;
  severity: FootSeverity;
  angle_degrees?: number;
  box?: BoundingBox;
}

export interface FootImageDetails {
  left_toe: ToeDetection;
  right_toe: ToeDetection;
}

export interface ShoeDetail {
  detected: boolean;
  primary_wear: string;
  gait_note?: string;
}

export interface ShoeImageDetails {
  left_shoe: ShoeDetail;
  right_shoe: ShoeDetail;
}

// ─── API Response Models ───────────────────────────────────────────────────────

export interface FootAssessment {
  id: number;
  user_id: string;
  date: string;
  pain_locations: string | null;
  nrs_pain_score: number;
  steps_count: number;
  standing_hours: number;
  created_at: string;
}

export interface FootImage {
  id: number;
  user_id: string;
  image_data: string;
  ai_severity: FootSeverity;
  ai_summary: string;
  ai_details: FootImageDetails | null;
  logged_at: string;
}

export interface ShoeImage {
  id: number;
  user_id: string;
  image_data: string;
  ai_risk_level: ShoeRiskLevel;
  ai_wear_pattern: ShoeWearPattern;
  ai_summary: string;
  ai_details: ShoeImageDetails | null;
  logged_at: string;
}

// ─── AI Analysis Results ──────────────────────────────────────────────────────

export interface HalluxValgusResult {
  success: boolean;
  ai_severity: FootSeverity;
  ai_summary: string;
  left_toe?: ToeDetection;
  right_toe?: ToeDetection;
}

export interface ShoeWearResult {
  success: boolean;
  ai_risk_level: ShoeRiskLevel;
  ai_wear_pattern: ShoeWearPattern;
  ai_summary: string;
  left_shoe?: ShoeDetail;
  right_shoe?: ShoeDetail;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export interface EducationVideo {
  youtubeId: string;
  doctor: string;
  title: string;
  description: string;
}

export interface SeverityStyle {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface SeverityClasses {
  border: string;
  badge: string;
  text: string;
}

export interface RiskClasses {
  badge: string;
  label: string;
}
