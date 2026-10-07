import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof makePrismaClient> | undefined }

function makePrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // CWE-778: Centralized Immutable Audit Trail for all database mutations
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isMutation = ['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(operation);
          
          if (isMutation && model !== 'RateLimit' && model !== 'Session') {
            // Log as structured JSON for immutable SIEM/LogAggregator ingestion
            console.log(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: 'AUDIT',
              model,
              operation,
              // Захист PII (CWE-200): не логуємо паролі та інші чутливі дані користувачів
              args: model === 'User' ? '[REDACTED_FOR_PRIVACY]' : args
            }));
          }
          
          return query(args);
        }
      }
    }
  });
}

export const prisma =
  globalForPrisma.prisma ??
  (process.env.NEXT_PHASE === 'phase-production-build'
    ? (new Proxy({} as ReturnType<typeof makePrismaClient>, {
        get(_target, prop) {
          if (!globalForPrisma.prisma) {
            globalForPrisma.prisma = makePrismaClient()
          }
          return (globalForPrisma.prisma as any)[prop]
        },
      }))
    : makePrismaClient())

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma