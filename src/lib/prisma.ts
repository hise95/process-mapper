import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function makePrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ??
  (process.env.NEXT_PHASE === 'phase-production-build'
    ? (new Proxy({} as PrismaClient, {
        get(_target, prop) {
          if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = makePrismaClient()
          }
          return (globalForPrisma.prisma as any)[prop]
        },
      }))
    : makePrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma