/**
 * Shared utility functions for the DTX monorepo, 避免 Barrel Export
 */

export { apiFetch } from './api'
export { validateEnv } from './env'
export {
  MILLISECONDS_PER_DAY,
  createDateFromYMD,
  daysDifference,
  addDaysToDate,
  getDateOnly,
  getTodayNormalized,
  dk,
  formatDate,
  parseUTCDate,
  formatUTCDate,
} from './date'

export {
  CYCLE_PHASE_OFFSETS,
  getPhaseForDay,
  getPhaseDay,
  getOvulationPeakDate,
  getFertileWindowStartDate,
  getFertileWindowEndDate,
  getNextPeriodStartDate,
  getNextPeriodEndDate,
  predictCycleDates,
  getCalendarDateStatus,
  calculateCycleInfo,
  calculateDayInfo,
} from './cycle'

export {
  SYMPTOMS,
  EMOTIONS,
  BLOOD_COLORS,
  CLOT_TYPES,
  PBAC_LEVELS,
  PRODUCTS,
  getScore,
  hasPeriodRecords,
  NoneClot,
  BlankBloodColor
} from './pbac'

export type { CycleInfo, DayInfo } from './cycle'
