// ─── Foot Care ────────────────────────────────────────────────────────────────

export type FootSeverity = 'normal' | 'mild' | 'moderate' | 'severe';
export type ShoeRiskLevel = 'low' | 'moderate' | 'high';
export type ShoeWearPattern =
  | 'medial_forefoot'
  | 'lateral'
  | 'heel_center'
  | 'toe_asymmetric'
  | 'uniform'
  | 'mixed';

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
  gait_note: string;
}

export interface ShoeImageDetails {
  left_shoe: ShoeDetail;
  right_shoe: ShoeDetail;
}

// ─── DB Input Types ────────────────────────────────────────────────────────────

export interface CreateFootAssessmentInput {
  pain_locations?: string;
  nrs_pain_score?: number;
  steps_count?: number;
  standing_hours?: number;
  date?: string;
}

export interface CreateFootImageInput {
  image_data?: string;
  ai_severity?: FootSeverity;
  ai_summary?: string;
  ai_details?: FootImageDetails;
}

export interface CreateShoeImageInput {
  image_data?: string;
  ai_risk_level?: ShoeRiskLevel;
  ai_wear_pattern?: ShoeWearPattern;
  ai_summary?: string;
  ai_details?: ShoeImageDetails;
}

export interface CreateSupplementInput {
  name: string;
  dosage?: string;
  frequency?: string;
  time_of_day?: string;
  notes?: string;
}

export interface CreateWoundInput {
  name?: string;
  location?: string;
  date_of_injury?: string;
  display_name?: string;
  picture_url?: string;
  wound_type?: string;
  body_location?: string;
}

export interface UpdateWoundInput {
  name?: string;
  wound_type?: string;
  body_location?: string;
  date_of_injury?: string;
}

export interface CreateWoundLogInput {
  image_data?: string;
  nrs_pain_score?: number;
  symptoms?: string;
  ai_assessment_summary?: string;
  ai_status_label?: string;
}

export interface CreateIntimacyAssessmentInput {
  gender?: string;
  primary_concern?: string;
  assessment_data?: unknown;
  ai_summary?: string;
}

export interface UpdateModuleInput {
  name_zh?: string;
  name_en?: string;
  is_active?: boolean;
  sort_order?: number;
  external_url?: string;
}

export interface CreateLineOAInput {
  name: string;
  description?: string;
  channel_access_token: string;
  channel_secret?: string;
  default_agent_id?: string;
  ai_skill_platform_url?: string;
  ai_skill_platform_api_key?: string;
  product_id?: string | null;
}

export interface UpdateLineOAInput {
  name?: string;
  description?: string;
  channel_access_token?: string;
  channel_secret?: string;
  default_agent_id?: string;
  ai_skill_platform_url?: string;
  ai_skill_platform_api_key?: string;
  product_id?: string | null;
  is_active?: boolean;
}

export interface CreateProductInput {
  name: string;
  description?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateTemplateInput {
  name: string;
  zones: unknown;
}

export interface UpdateTemplateInput {
  name?: string;
  zones?: unknown;
}

// ─── AI Analysis ──────────────────────────────────────────────────────────────

export type AnalysisMode =
  | 'label'
  | 'checkin'
  | 'wound'
  | 'hallux_valgus'
  | 'shoe_wear'
  | 'sexual_health';

export interface AnalyzeRequestBody {
  image: string;
  mode?: AnalysisMode;
  prompt?: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  email: string;
  password: string;
  displayName?: string;
}

export interface LineLoginRequestBody {
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
}

export interface TokenPayload {
  userId: string;
  [key: string]: unknown;
}

// ─── Hono Environment ─────────────────────────────────────────────────────────

export type HonoVariables = {
  userId: string;
};

export type HonoEnv = {
  Variables: HonoVariables;
};
