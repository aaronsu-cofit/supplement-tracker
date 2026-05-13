/**
 * Client and Session Types
 */

import type { AuthSource } from './auth'

/**
 * Client record from database
 */
export interface Client {
  id: string
  externalUserId: string
  source: AuthSource
  email: string | null
  displayName: string | null
  cycleLength: number | null
  periodLength: number | null
  onboardingDone: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Auth session record from database
 */
export interface AuthSession {
  id: string
  clientId: string
  jti: string
  expiresAt: Date
  createdAt: Date
}
