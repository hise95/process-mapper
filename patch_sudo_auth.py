import sys

with open("src/lib/auth.ts", "r") as f:
    code = f.read()

import re

# 1. Update rotateSessionIfNeeded
old_rotate = """        userId: sessionRecord.userId,
        expiresAt: new Date(expiresAtMs),
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
        authMethod: sessionRecord.authMethod
      }
    })"""

new_rotate = """        userId: sessionRecord.userId,
        expiresAt: new Date(expiresAtMs),
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
        authMethod: sessionRecord.authMethod,
        authenticatedAt: sessionRecord.authenticatedAt // CWE-287: Зберігаємо оригінальний час для Sudo
      }
    })"""
code = code.replace(old_rotate, new_rotate)

# 2. Add getSudoSession
sudo_func = """
/**
 * Отримати сесію з перевіркою Sudo Mode (Step-Up Auth) для критичних операцій.
 * @returns { user, sudoRequired }
 */
export async function getSudoSession(): Promise<{ user: SessionUser | null, sudoRequired: boolean }> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value
  if (!cookieValue) return { user: null, sudoRequired: false }
  
  const sessionId = verifyValue(cookieValue)
  if (!sessionId) return { user: null, sudoRequired: false }
  
  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, fullName: true, role: true } } }
  })
  
  const now = new Date()
  if (!sessionRecord || sessionRecord.expiresAt < now) return { user: null, sudoRequired: false }
  
  // Sudo вікно - 15 хвилин з моменту реального вводу пароля
  const isSudo = now.getTime() - sessionRecord.authenticatedAt.getTime() <= 15 * 60 * 1000;
  return { user: sessionRecord.user, sudoRequired: !isSudo };
}
"""

code = code + "\n" + sudo_func

with open("src/lib/auth.ts", "w") as f:
    f.write(code)
print("Added getSudoSession and preserved authenticatedAt")
