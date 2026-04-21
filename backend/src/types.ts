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

export type ContentItemType = 'text' | 'flex' | 'card';

export interface CreateContentItemInput {
  key: string;
  type?: ContentItemType;
  title?: string;
  body?: string;
  metadata?: unknown;
}

export interface UpdateContentItemInput {
  key?: string;
  type?: ContentItemType;
  title?: string | null;
  body?: string | null;
  metadata?: unknown;
  is_active?: boolean;
}

export type IntentMatchType = 'keyword' | 'regex' | 'exact';
export type IntentActionType =
  | 'reply_content'
  | 'set_attribute'
  | 'assign_mission'
  | 'complete_mission'
  | 'increment_mission_progress'
  | 'increment_streak';

export interface ReplyContentAction {
  content_key: string;
}

export interface SetAttributeAction {
  key: string;
  value: string;
  reply_content_key?: string;
}

export interface MissionAction {
  mission_key: string;
  reply_content_key?: string;
}

export interface IncrementMissionAction {
  mission_key: string;
  step?: number;
  reply_content_key?: string;
}

export interface IncrementStreakAction {
  streak_key: string;
  reply_content_key?: string;
}

// Actions that run when a mission completes. Reply-type actions are
// intentionally not included: completion can be triggered asynchronously
// (attribute auto-complete, progress reach), where there's no reply token.
export type MissionCompleteAction =
  | { type: 'set_attribute'; key: string; value: string }
  | { type: 'assign_mission'; mission_key: string }
  | { type: 'increment_streak'; streak_key: string };

export interface AutoCompleteRule {
  attribute_key: string;
  match_value?: string;
}

export interface CreateMissionTemplateInput {
  key: string;
  name: string;
  description?: string;
  progress_target?: number;
  auto_complete_on_attribute?: AutoCompleteRule | null;
  on_complete_actions?: MissionCompleteAction[];
}

export interface UpdateMissionTemplateInput {
  key?: string;
  name?: string;
  description?: string | null;
  progress_target?: number;
  auto_complete_on_attribute?: AutoCompleteRule | null;
  on_complete_actions?: MissionCompleteAction[];
  is_active?: boolean;
}

export type IntentActionConfig =
  | ReplyContentAction
  | SetAttributeAction
  | MissionAction
  | IncrementMissionAction
  | IncrementStreakAction;

export type BadgeCriteria =
  | { type: 'streak_reached'; streak_key: string; threshold: number }
  | { type: 'mission_completed'; mission_key: string };

export interface CreateBadgeTemplateInput {
  key: string;
  name: string;
  description?: string;
  icon?: string;
  criteria: BadgeCriteria;
}

export interface UpdateBadgeTemplateInput {
  key?: string;
  name?: string;
  description?: string | null;
  icon?: string | null;
  criteria?: BadgeCriteria;
  is_active?: boolean;
}

// ─── Journey state machine ──────────────────────────────────────────────────

export interface JourneyPhase {
  key: string;
  name: string;
  description?: string;
  icon?: string;
}

export type JourneyTrigger =
  | { type: 'mission_completed'; mission_key: string }
  | { type: 'attribute_equals'; attribute_key: string; value: string }
  | { type: 'badge_earned'; badge_key: string };

export interface JourneyTransition {
  // undefined means "from any phase (including no current phase)" — used
  // to describe the entry transition that drops a new user into their
  // first phase.
  from_phase?: string;
  to_phase: string;
  trigger: JourneyTrigger;
}

export interface CreateJourneyTemplateInput {
  key: string;
  name: string;
  description?: string;
  phases: JourneyPhase[];
  transitions: JourneyTransition[];
}

export interface UpdateJourneyTemplateInput {
  key?: string;
  name?: string;
  description?: string | null;
  phases?: JourneyPhase[];
  transitions?: JourneyTransition[];
  is_active?: boolean;
}

export interface CreateIntentRuleInput {
  name: string;
  priority?: number;
  match_type?: IntentMatchType;
  patterns: string[];
  action_type: IntentActionType;
  action_config: IntentActionConfig;
}

export interface UpdateIntentRuleInput {
  name?: string;
  priority?: number;
  match_type?: IntentMatchType;
  patterns?: string[];
  action_type?: IntentActionType;
  action_config?: IntentActionConfig;
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
