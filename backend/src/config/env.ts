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
  AUTH_REFRESH_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  TRANSCRIPT_GENERATE_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1000 * 60 * 60),
  TRANSCRIPT_GENERATE_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_BUCKET: z.string().min(1).default('vidpilot-media'),
  S3_ACCESS_KEY_ID: z.string().min(1).default('minioadmin'),
  S3_SECRET_ACCESS_KEY: z.string().min(1).default('minioadmin'),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  MAX_MULTIPART_PARTS: z.coerce.number().int().positive().default(10000),
  MULTIPART_THRESHOLD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(100 * 1024 * 1024),
  MULTIPART_PART_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  PRESIGNED_UPLOAD_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),
  PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: z.coerce.number().int().positive().default(900),
  RABBITMQ_URL: z.url().default('amqp://localhost:5672'),
  YOUTUBE_CLIENT_ID: z.string().min(1, 'YOUTUBE_CLIENT_ID is required'),
  YOUTUBE_CLIENT_SECRET: z.string().min(1, 'YOUTUBE_CLIENT_SECRET is required'),
  YOUTUBE_REDIRECT_URI: z.url('YOUTUBE_REDIRECT_URI must be a valid URL'),
  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required'),
  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),
  FACEBOOK_REDIRECT_URI: z.url('FACEBOOK_REDIRECT_URI must be a valid URL'),
  FACEBOOK_GRAPH_API_VERSION: z.string().min(1).default('v25.0'),
  PLATFORM_TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, 'PLATFORM_TOKEN_ENCRYPTION_KEY is required')
    .refine((value: string): boolean => {
      try {
        return Buffer.from(value, 'base64').length === 32
      } catch {
        return false
      }
    }, 'PLATFORM_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key'),
  PLATFORM_OAUTH_STATE_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000),
  FRONTEND_OAUTH_REDIRECT_URL: z.url().default('http://localhost:5173/settings/integrations')
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
    refreshPath: '/api/v1/auth',
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
    refreshLimit: env.AUTH_REFRESH_RATE_LIMIT,
    transcriptGenerateWindowMs: env.TRANSCRIPT_GENERATE_RATE_LIMIT_WINDOW_MS,
    transcriptGenerateLimit: env.TRANSCRIPT_GENERATE_RATE_LIMIT
  },
  s3: {
    endpoint: env.S3_ENDPOINT,
    publicEndpoint: env.S3_PUBLIC_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE
  },
  upload: {
    maxMultipartParts: env.MAX_MULTIPART_PARTS,
    multipartThresholdBytes: env.MULTIPART_THRESHOLD_BYTES,
    multipartPartSizeBytes: env.MULTIPART_PART_SIZE_BYTES,
    presignedUploadExpiredSeconds: env.PRESIGNED_UPLOAD_EXPIRES_SECONDS,
    presignedDownloadExpiredSeconds: env.PRESIGNED_DOWNLOAD_EXPIRES_SECONDS
  },
  rabbitmq: {
    url: env.RABBITMQ_URL
  },
  platform: {
    youtubeClientId: env.YOUTUBE_CLIENT_ID,
    youtubeClientSecret: env.YOUTUBE_CLIENT_SECRET,
    youtubeRedirectUri: env.YOUTUBE_REDIRECT_URI,
    facebookAppId: env.FACEBOOK_APP_ID,
    facebookAppSecret: env.FACEBOOK_APP_SECRET,
    facebookRedirectUri: env.FACEBOOK_REDIRECT_URI,
    facebookGraphApiVersion: env.FACEBOOK_GRAPH_API_VERSION,
    tokenEncryptionKey: env.PLATFORM_TOKEN_ENCRYPTION_KEY,
    oauthStateTtlMs: env.PLATFORM_OAUTH_STATE_TTL_MS,
    frontendOauthRedirectUrl: env.FRONTEND_OAUTH_REDIRECT_URL
  }
} as const

export type Config = typeof config
