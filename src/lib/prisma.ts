import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

import path from 'path'
import fs from 'fs'

function getDatabaseUrl() {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    return process.env.DATABASE_URL
  }
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'dev.db')
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
  return `file:${path.join(process.cwd(), 'prisma', 'dev.db')}`
}

const activeDbUrl = getDatabaseUrl()
process.env.DATABASE_URL = activeDbUrl

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