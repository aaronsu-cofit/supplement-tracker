export type MissionType =
  | 'one_shot'
  | 'binary_daily'
  | 'quantitative_daily'
  | 'checklist_daily';

export interface MissionSubtask { key: string; label: string }

export interface MissionTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  mission_type: MissionType;
  frequency: string;
  daily_target: number | null;
  unit: string | null;
  step_value: number | null;
  subtasks: MissionSubtask[] | null;
  category: string | null;
  action_url: string | null;
  progress_target: number;
  is_active: boolean;
}

export interface DailyLog {
  id: number;
  user_id: string;
  template_id: string;
  date: string;
  completed: boolean;
  skipped: boolean;
  value: number;
  subtask_state: Record<string, boolean> | null;
  note: string | null;
  completed_at: string | null;
}

export interface UserMissionSetting {
  daily_target: number | null;
  reminder_enabled: boolean | null;
  reminder_time: string | null;
}

export interface HabitRow {
  assignment: {
    id: string;
    status: string;
    assigned_at: string;
    progress_current: number;
    progress_target: number;
  };
  template: MissionTemplate;
  user_setting?: UserMissionSetting | null;
  today_log: DailyLog | null;
}

export interface HabitsResponse {
  date: string;
  timezone: string;
  habits: HabitRow[];
}

export interface HistoryResponse {
  mission_key: string;
  from: string;
  to: string;
  logs: DailyLog[];
}

export interface UserStreakRow {
  id: number;
  streak_key: string;
  count_current: number;
  count_best: number;
  last_occurred_on: string | null;
}

export interface UserBadgeRow {
  id: number;
  earned_at: string;
  template: { id: string; key: string; name: string; icon: string | null; description: string | null };
}

export interface UserJourneyPhaseRow {
  id: number;
  journey_key: string;
  phase_key: string;
  entered_at: string;
}

export interface AvailableMission extends MissionTemplate {
  is_subscribed: boolean;
}
