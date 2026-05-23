import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client'
import { config } from '../../config/index'

const adapter = new PrismaPg({ connectionString: config.database.url })

const prisma = new PrismaClient({
  adapter,
  log: ['info', 'warn', 'error']
})

export { prisma }
