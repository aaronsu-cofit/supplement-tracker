/**
 * Authentication and Authorization Types
 */

/**
 * Authentication source types
 */
export enum AuthSource {
  LINE = 'line',
  MOBILE_APP = 'mobile_app',
}

/**
 * Payload for LINE LIFF token verification
 */
export interface LineTokenPayload {
  token: string
}

/**
 * Payload for OAuth code exchange
 */
export interface OAuthCodePayload {
  code: string
  redirectUri?: string
}

/**
 * Verification result from external auth sources
 */
export interface ExternalAuthResult {
  userId: string
  source: AuthSource
  email?: string
  displayName?: string
}

/**
 * JWT payload for internal authentication
 * Supports both external auth (LINE, Mobile App) and admin authentication
 */
export interface JWTPayload {
  // Admin authentication
  userId?: string // Admin user ID (for admin/password auth)

  // External authentication
  sub?: string // clientId (for external auth)
  source?: AuthSource // Auth source (for external auth)
  externalUserId?: string // User ID from external source (LINE, App, etc.)

  // Common fields
  jti: string // session ID
  iat: number
  exp: number
}

/**
 * Auth token response
 */
export interface AuthTokenResponse {
  accessToken: string
  expiresIn: number
  tokenType: 'Bearer'
}
