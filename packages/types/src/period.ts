/**
 * Period Types for Menstrual Cycle Tracking
 */

/**
 * Period record from database
 */
export interface Period {
  id: string
  clientId: string
  startDate: Date
  endDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Payload for creating a new period
 */
export interface CreatePeriodPayload {
  startDate: string // ISO date string
  endDate?: string // ISO date string (optional)
  notes?: string
}

/**
 * Payload for updating an existing period
 */
export interface UpdatePeriodPayload {
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  notes?: string
}

/**
 * Period query filters
 */
export interface PeriodQueryFilters {
  startDate?: string // ISO date string - filter periods after this date
  endDate?: string // ISO date string - filter periods before this date
  limit?: number
  offset?: number
}

/**
 * Period API response
 */
export interface PeriodResponse {
  id: string
  clientId: string
  startDate: string // ISO date string
  endDate: string | null // ISO date string
  notes: string | null
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
}

/**
 * Daily log data structure (stored as JSON)
 */
export interface DailyLogData {
  period: boolean
  flow?: '少' | '中' | '多' | null
  symptoms?: string[]
  emotions?: string[]
  bloodColor?: string | null
  clot?: string | null
  pbacLogs?: Array<{
    level: 'light' | 'medium' | 'heavy'
    count: number
    clot?: string | null
    time: string
    score: number
  }>
}

/**
 * Daily log API response
 */
export interface DailyLogResponse {
  id: string
  clientId: string
  date: string // ISO date string
  data: DailyLogData
  createdAt: string
  updatedAt: string
}

/**
 * Payload for saving/updating a daily log
 */
export interface SaveDailyLogPayload {
  date: string // ISO date string
  data: DailyLogData
}

/**
 * Payload for cycle setup
 */
export interface CycleSetupPayload {
  lastPeriodStart: { y: number; m: number; d: number }
  periodDuration: number
  cycleLen: number
}

/**
 * Payload for updating cycle settings
 */
export interface UpdateCycleSettingsPayload {
  periodDuration: number
  cycleLen: number
  lastPeriodStart?: { y: number; m: number; d: number } | null
}
