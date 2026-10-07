import sys

with open("src/lib/auth.ts", "r") as f:
    code = f.read()

import re

old_build = """export async function buildSessionCookieValue(userId: string): Promise<string> {
  const expiresAtMs = Date.now() + 1000 * 60 * 60 * 8; // 8 hours
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(expiresAtMs)
    }
  });
  return signValue(session.id, expiresAtMs);
}"""

new_build = """export async function buildSessionCookieValue(
  userId: string, 
  ipAddress?: string, 
  userAgent?: string, 
  authMethod?: string
): Promise<string> {
  const expiresAtMs = Date.now() + 1000 * 60 * 60 * 8; // 8 hours
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(expiresAtMs),
      ipAddress,
      userAgent,
      authMethod
    }
  });
  return signValue(session.id, expiresAtMs);
}"""

if old_build in code:
    code = code.replace(old_build, new_build)
    with open("src/lib/auth.ts", "w") as f:
        f.write(code)
    print("Patched buildSessionCookieValue")
else:
    print("Could not find buildSessionCookieValue block")
