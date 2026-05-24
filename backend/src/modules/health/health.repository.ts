import { prisma } from '../../infrastructure/db/prisma'

export const checkDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`
}
