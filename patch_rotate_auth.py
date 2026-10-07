import sys

with open("src/lib/auth.ts", "r") as f:
    code = f.read()

import re

# Insert rotateSessionIfNeeded right before getSession
new_func = """
/**
 * CWE-384: Session Rotation
 * Перевіряє час створення поточної сесії. Якщо вона старіша за 15 хвилин,
 * видає нову сесію (новий ID) і видаляє стару, повертаючи нове значення для cookie.
 */
export async function rotateSessionIfNeeded(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value
  if (!cookieValue) return null
  
  const sessionId = verifyValue(cookieValue)
  if (!sessionId) return null

  const sessionRecord = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!sessionRecord) return null

  const now = new Date()
  const ROTATION_INTERVAL_MS = 15 * 60 * 1000 // 15 хвилин
  
  if (now.getTime() - sessionRecord.createdAt.getTime() > ROTATION_INTERVAL_MS) {
    const expiresAtMs = Date.now() + 1000 * 60 * 60 * 8;
    const newSession = await prisma.session.create({
      data: {
        userId: sessionRecord.userId,
        expiresAt: new Date(expiresAtMs),
        ipAddress: sessionRecord.ipAddress,
        userAgent: sessionRecord.userAgent,
        authMethod: sessionRecord.authMethod
      }
    })
    
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    
    return signValue(newSession.id, expiresAtMs)
  }
  
  return null;
}

export async function getSession(): Promise<SessionUser | null> {"""

code = code.replace("export async function getSession(): Promise<SessionUser | null> {", new_func)

with open("src/lib/auth.ts", "w") as f:
    f.write(code)
print("Added rotateSessionIfNeeded")
