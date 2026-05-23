import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'
import { defineConfig, env } from 'prisma/config'

const backendDir: string = path.dirname(fileURLToPath(import.meta.url))
const repoRoot: string = path.resolve(backendDir, '..')

const envPaths: readonly string[] = [
  path.resolve(backendDir, '.env'),
  path.resolve(repoRoot, 'infrastructure/.env'),
  path.resolve(repoRoot, '.env')
]
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
