import { z } from 'zod'
import { db } from '../lib/db.js'

/**
 * Validation schema for creating a period
 */
const createPeriodSchema = z
  .object({
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
    endDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
      .optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate)
      }
      return true
    },
    {
      message: 'endDate must be after startDate',
      path: ['endDate'],
    }
  )

/**
 * Validation schema for period query filters
 */
const periodQueryFiltersSchema = z.object({
  startDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Invalid date format')
    .optional(),
  limit: z.number().min(1).max(100).optional().default(100),
  offset: z.number().min(0).optional().default(0),
})

/**
 * Convert Period database record to API response
 */
function toPeriodResponse(period: {
  id: string
  user_id: string
  startDate: Date
  endDate: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}): any {
  return {
    id: period.id,
    userId: period.user_id,
    startDate: period.startDate.toISOString(),
    endDate: period.endDate ? period.endDate.toISOString() : null,
    notes: period.notes,
    createdAt: period.created_at.toISOString(),
    updatedAt: period.updated_at.toISOString(),
  }
}

/**
 * Create a new period for a user
 */
export async function createPeriod(
  userId: string,
  payload: any
): Promise<any> {
  // Validate payload
  const validated = createPeriodSchema.parse(payload)

  // Create period in database
  const period = await db().period.create({
    data: {
      user_id: userId,
      startDate: new Date(validated.startDate),
      endDate: validated.endDate ? new Date(validated.endDate) : null,
      notes: validated.notes || null,
    },
  })

  return toPeriodResponse(period)
}

/**
 * List periods for a client with optional filters
 */
export async function listPeriods(
  client: Client,
  filters: PeriodQueryFilters
): Promise<PeriodResponse[]> {
  // Validate filters
  const validated = periodQueryFiltersSchema.parse(filters)

  // Build where clause
  const where: any = {
    clientId: client.id,
  }

  if (validated.startDate) {
    where.startDate = { gte: new Date(validated.startDate) }
  }

  if (validated.endDate) {
    where.endDate = { lte: new Date(validated.endDate) }
  }

  // Query database
  const periods = await prisma.period.findMany({
    where,
    orderBy: { startDate: 'desc' },
    take: validated.limit,
    skip: validated.offset,
  })

  return periods.map(toPeriodResponse)
}
