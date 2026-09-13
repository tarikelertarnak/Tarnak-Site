import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  ARCJET_KEY: z.string().default(''),
  DISCORD_WEBHOOK_URL: z.string().optional(),
})

// eslint-disable-next-line node/prefer-global/process
const { data: env, error } = EnvSchema.safeParse(process.env)

if (error) {
  console.error('❌ Invalid env:')
  console.error(JSON.stringify(error.message, null, 2))
  console.warn('⚠️ Site is starting anyway (missing settings will be used as disabled).')
}

export default env || { NODE_ENV: 'development', ARCJET_KEY: '' }
