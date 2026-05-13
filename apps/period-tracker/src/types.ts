export interface CycleHistory {
  start: string
  end: string
  days: number
  cycleLength?: number
  pbacTotal: number
  cur?: boolean
  pbacDays: Array<{
    day: number
    score: number
    colors: string[]
    clot: string
  }>
  symptoms: string[]
  emotions: string[]
}

export interface PbacLog {
  id: number
  level: 'light' | 'medium' | 'heavy'
  color?: string
  clot?: string
  time: string
  product?: 'pad' | 'tampon' | 'cup'
}

export interface DayLog {
  period?: boolean
  flow?: '少' | '中' | '多'
  symptoms?: string[]
  emotions?: string[]
  pbacLogs?: PbacLog[]
  pbacProduct?: 'pad' | 'tampon' | 'cup'
  bloodColor?: string
  clot?: string
  [key: string]: any
}

export interface UserData {
  hasData: boolean
  lastPeriodStart: { y: number; m: number; d: number } | null
  periodDuration: number
  cycleLen: number
  dayData: Record<string, DayLog>
}
