import { z } from 'zod'

/**
 * Validate environment variables against a Zod schema
 *
 * @param schema - Zod schema defining expected environment variables
 * @returns Parsed and validated environment variables
 * @throws Error if validation fails with detailed error messages
 *
 * @example
 * ```ts
 * const envSchema = z.object({
 *   PORT: z.coerce.number().default(3000),
 *   NODE_ENV: z.enum(['development', 'production', 'test']),
 *   DATABASE_URL: z.string().url(),
 * })
 *
 * const env = validateEnv(envSchema)
 * console.log(env.PORT) // 3000 (number type)
 * ```
 */
export function validateEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  try {
    const parsed = schema.parse(process.env)
    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors
      const formattedErrors = error.issues.map((issue) => {
        const path = issue.path.join('.')
        return `  - ${path}: ${issue.message}`
      })

      throw new Error(`Environment variable validation failed:\n${formattedErrors.join('\n')}`, {
        cause: error,
      })
    }
    throw error
  }
}
