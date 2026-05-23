import { existsSync } from 'node:fs'
import path from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

const envPaths: readonly string[] = [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../.env')]
const envPath: string | undefined = envPaths.find((candidate: string): boolean => existsSync(candidate))

loadDotenv(envPath ? { path: envPath } : undefined)

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: env('DATABASE_URL')
  }
})
