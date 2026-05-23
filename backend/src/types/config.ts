export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production'
  isDevelopment: boolean
  isProduction: boolean
  isTest: boolean
  port: number
}

export interface DatabaseConfig {
  url: string
}

export interface SecurityConfig {
  jwtSecret: string
  accessTokenExpiresIn: string
  saltRounds: number
  refreshTokenTTLMs: number
}

export interface CookieConfig {
  refreshName: string
  refreshPath: string
  refreshOptions: {
    httpOnly: true
    secure: boolean
    sameSite: 'lax'
    maxAge: number
  }
}

export interface RateLimitConfig {
  authWindowMs: number
  registerLimit: number
  loginLimit: number
  refreshLimit: number
}

export interface S3Config {
  endpoint: string
  publicEndpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export interface UploadConfig {
  maxMultipartParts: number
  multipartThresholdBytes: number
  multipartPartSizeBytes: number
  presignedUploadExpiredSeconds: number
  presignedDownloadExpiredSeconds: number
}

export interface Config {
  app: AppConfig
  database: DatabaseConfig
  security: SecurityConfig
  cookie: CookieConfig
  rateLimit: RateLimitConfig
  s3: S3Config
  upload: UploadConfig
}
