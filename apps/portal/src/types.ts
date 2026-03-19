// ─── Modules ──────────────────────────────────────────────────────────────────

export interface AppModule {
  id: string;
  name_zh: string;
  name_en: string;
  is_active: boolean;
  external_url?: string | null;
}

export interface ModuleStyleConfig {
  bg: string;
  emoji: string;
  color: string;
}
