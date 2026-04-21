// ─── HQ Domain ───────────────────────────────────────────────────────────────

export interface HQModule {
  id: string;
  name_zh: string;
  name_en: string;
  is_active: boolean;
  external_url?: string | null;
}

export interface HQUser {
  id: string;
  display_name: string | null;
  email: string | null;
  picture_url: string | null;
  role: string;
  created_at: string;
}

export interface UserAttribute {
  id: number;
  user_id: string;
  key: string;
  value: string | null;
  set_at: string;
}

export interface UserMissionAssignment {
  id: string;
  user_id: string;
  template_id: string;
  status: string;
  progress_current: number;
  progress_target: number;
  assigned_at: string;
  completed_at: string | null;
  template: {
    id: string;
    key: string;
    name: string;
    product_id: string;
  };
}

export interface UserStreakRow {
  id: number;
  product_id: string;
  user_id: string;
  streak_key: string;
  count_current: number;
  count_best: number;
  last_occurred_on: string | null;
  updated_at: string;
}

export interface UserBadgeRow {
  id: number;
  user_id: string;
  template_id: string;
  earned_at: string;
  template: {
    id: string;
    key: string;
    name: string;
    icon: string | null;
    description: string | null;
    product_id: string;
  };
}

export interface EngagementEventRow {
  id: number;
  user_id: string;
  event_type: string;
  payload: string | null;
  occurred_at: string;
}

// ─── LINE OA ─────────────────────────────────────────────────────────────────

export interface LineOA {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  line_destination_id?: string | null;
  has_channel_secret?: boolean;
  default_agent_id?: string;
  ai_skill_platform_url?: string | null;
  has_ai_skill_platform_api_key?: boolean;
  product_id?: string | null;
}

// ─── Products (shareable config bundles across OAs) ─────────────────────────

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  oa_count?: number;
}

export interface ProductWithOAs extends Product {
  oas: Array<{ id: string | number; name: string; is_active: boolean }>;
}

export type ContentItemType = 'text' | 'flex' | 'card';

export interface ContentItem {
  id: string;
  product_id: string;
  key: string;
  type: ContentItemType;
  title: string | null;
  body: string | null;
  metadata: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type IntentMatchType = 'keyword' | 'regex' | 'exact';
export type IntentActionType =
  | 'reply_content'
  | 'set_attribute'
  | 'assign_mission'
  | 'complete_mission'
  | 'increment_mission_progress'
  | 'increment_streak';

export interface IntentRule {
  id: string;
  product_id: string;
  name: string;
  priority: number;
  match_type: IntentMatchType;
  patterns: string[];
  action_type: IntentActionType;
  action_config: {
    content_key?: string;
    key?: string;
    value?: string;
    reply_content_key?: string;
    mission_key?: string;
    step?: number;
    streak_key?: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MissionCompleteAction =
  | { type: 'set_attribute'; key: string; value: string }
  | { type: 'assign_mission'; mission_key: string }
  | { type: 'increment_streak'; streak_key: string };

export interface AutoCompleteRule {
  attribute_key: string;
  match_value?: string;
}

export interface MissionTemplate {
  id: string;
  product_id: string;
  key: string;
  name: string;
  description: string | null;
  progress_target: number;
  auto_complete_on_attribute: AutoCompleteRule | null;
  on_complete_actions: MissionCompleteAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BadgeCriteria =
  | { type: 'streak_reached'; streak_key: string; threshold: number }
  | { type: 'mission_completed'; mission_key: string };

export interface BadgeTemplate {
  id: string;
  product_id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  criteria: BadgeCriteria;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Zone {
  id: string;
  position: string;
  label: string;
  uri: string;
}

export interface LineTemplate {
  id: string;
  name: string;
  zones: Zone[];
  is_active: boolean;
  line_rich_menu_id?: string | null;
}

export interface ActionStatus {
  type: 'success' | 'error';
  message: string;
}

// ─── UI ──────────────────────────────────────────────────────────────────────

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  liffIdEnv: string;
  route: string;
  adminRoute: string | null;
  icon: string;
}

export interface MenuMapping {
  label: string;
  route: string;
}
