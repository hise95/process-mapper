import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

import path from 'path'
import fs from 'fs'

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'dev.db')
    // Якщо файл у /tmp ще не створено, копіюємо початковий dev.db
    if (!fs.existsSync(tmpDbPath)) {
      const rootDbPath = path.join(process.cwd(), 'prisma', 'dev.db')
      if (fs.existsSync(rootDbPath)) {
        try {
          fs.copyFileSync(rootDbPath, tmpDbPath)
        } catch (e) {
          console.error('Failed to copy seed db to /tmp:', e)
        }
      }
    }
    return `file:${tmpDbPath}`
  }
  return 'file:./dev.db'
}

function makePrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
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