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

export interface Config {
  app: AppConfig
  database: DatabaseConfig
}
