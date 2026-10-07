import sys

with open("src/lib/auth.ts", "r") as f:
    code = f.read()

import re

old_get_session = """  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, fullName: true, role: true } } }
  })

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    return null
  }

  return sessionRecord.user
}"""

new_get_session = """  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, fullName: true, role: true } } }
  })

  const now = new Date();

  // CWE-613: Absolute timeout
  if (!sessionRecord || sessionRecord.expiresAt < now) {
    return null;
  }

  // CWE-613: Idle timeout (30 minutes)
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  if (now.getTime() - sessionRecord.lastAccessedAt.getTime() > IDLE_TIMEOUT_MS) {
    // Сесія неактивна занадто довго - видаляємо
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    return null;
  }

  // Оновлюємо lastAccessedAt, але робимо це не частіше 1 разу на 5 хвилин для оптимізації БД (debouncing)
  if (now.getTime() - sessionRecord.lastAccessedAt.getTime() > 5 * 60 * 1000) {
    // Fire-and-forget оновлення
    prisma.session.update({
      where: { id: sessionId },
      data: { lastAccessedAt: now }
    }).catch(() => {});
  }

  return sessionRecord.user
}"""

if old_get_session in code:
    code = code.replace(old_get_session, new_get_session)
    with open("src/lib/auth.ts", "w") as f:
        f.write(code)
    print("Patched getSession idle timeout")
else:
    print("Could not find getSession block")
