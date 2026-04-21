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
