import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

const configDir: string = path.dirname(fileURLToPath(import.meta.url))
const backendDir: string = path.resolve(configDir, '../..')
const repoRoot: string = path.resolve(backendDir, '..')

const envPaths: readonly string[] = [
  path.resolve(backendDir, '.env'),
  path.resolve(repoRoot, 'infrastructure/.env'),
  path.resolve(repoRoot, '.env')
]

const envPath: string | undefined = envPaths.find((candidate: string): boolean => existsSync(candidate))

loadDotenv(envPath ? { path: envPath, quiet: true } : { quiet: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required')
})

const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  const details: string = z.prettifyError(parsedEnv.error)
  throw new Error(`Invalid environment configuration:\n${details}`)
}

const env = parsedEnv.data

export const config = {
  app: {
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
    port: env.PORT
  },
  database: {
    url: env.DATABASE_URL
  }
} as const

export type Config = typeof config
