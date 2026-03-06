import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FETCH_DELAY_MS: z.coerce.number().int().min(500).default(2000),
  CRON_SCHEDULE: z.string().default('0 2 * * *'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  supabase: {
    url: parsed.data.SUPABASE_URL,
    serviceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
  },
  fetchDelayMs: parsed.data.FETCH_DELAY_MS,
  cronSchedule: parsed.data.CRON_SCHEDULE,
}
