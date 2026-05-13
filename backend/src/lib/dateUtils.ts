/**
 * Parse a date string (YYYY-MM-DD format) to UTC Date
 * Avoids timezone issues by treating input as UTC
 */
export function parseUTCDate(dateString: string): Date {
  // Ensure we're parsing as UTC by adding 'Z' if not present
  const normalized = dateString.includes('T') || dateString.includes('Z')
    ? dateString
    : `${dateString}T00:00:00Z`
  return new Date(normalized)
}

/**
 * Format Date to YYYY-MM-DD string in UTC
 */
export function formatUTCDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
