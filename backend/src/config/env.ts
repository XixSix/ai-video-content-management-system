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
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .default('development-secret-change-me-32-chars'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1).default('15m'),
  SALT_ROUNDS: z.coerce.number().int().positive().default(12),
  REFRESH_TOKEN_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000 * 60 * 60 * 24 * 30),
  REFRESH_COOKIE_NAME: z.string().min(1).default('refreshToken'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000 * 60 * 15),
  AUTH_REGISTER_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  AUTH_LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  AUTH_REFRESH_RATE_LIMIT: z.coerce.number().int().positive().default(30)
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
  },
  security: {
    jwtSecret: env.JWT_SECRET,
    accessTokenExpiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
    saltRounds: env.SALT_ROUNDS,
    refreshTokenTTLMs: env.REFRESH_TOKEN_TTL_MS
  },
  cookie: {
    refreshName: env.REFRESH_COOKIE_NAME,
    refreshPath: '/api/auth',
    refreshOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: env.REFRESH_TOKEN_TTL_MS
    }
  },
  rateLimit: {
    authWindowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    registerLimit: env.AUTH_REGISTER_RATE_LIMIT,
    loginLimit: env.AUTH_LOGIN_RATE_LIMIT,
    refreshLimit: env.AUTH_REFRESH_RATE_LIMIT
  }
} as const

export type Config = typeof config
