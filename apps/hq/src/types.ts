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
