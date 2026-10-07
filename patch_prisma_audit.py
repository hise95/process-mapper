import sys

with open("src/lib/prisma.ts", "r") as f:
    code = f.read()

import re

# Change type of globalForPrisma
old_global = "const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }"
new_global = "const globalForPrisma = globalThis as unknown as { prisma: ReturnType<typeof makePrismaClient> | undefined }"
code = code.replace(old_global, new_global)

# Add extension to makePrismaClient
old_make = """function makePrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}"""

new_make = """function makePrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  // CWE-778: Centralized Immutable Audit Trail for all database mutations
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isMutation = ['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(operation);
          
          if (isMutation && model !== 'SecurityAuditLog' && model !== 'RateLimit' && model !== 'Session') {
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
}"""

code = code.replace(old_make, new_make)

# Also fix the proxy cast if used
code = code.replace("new Proxy({} as PrismaClient", "new Proxy({} as ReturnType<typeof makePrismaClient>")

with open("src/lib/prisma.ts", "w") as f:
    f.write(code)
print("Patched prisma.ts for global audit")
