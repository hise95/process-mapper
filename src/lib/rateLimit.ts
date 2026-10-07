import { prisma } from './prisma';

/**
 * Basic DB-backed Rate Limiter
 * Returns { allowed: boolean, remaining: number }
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = new Date();
    // CWE-362: Виправляємо Race Condition. 
    // Робимо атомарний upsert (increment) ПЕРЕД перевіркою ліміту.
    const record = await prisma.rateLimit.upsert({
      where: { key },
      create: { key, count: 1, expiresAt: new Date(now.getTime() + windowMs) },
      update: { count: { increment: 1 } },
    });

    // Якщо час ліміту минув, скидаємо лічильник (починаємо нове вікно)
    if (record.expiresAt < now) {
      await prisma.rateLimit.update({
        where: { key },
        data: { count: 1, expiresAt: new Date(now.getTime() + windowMs) },
      });
      return { allowed: true, remaining: limit - 1 };
    }

    // Якщо після атомарного збільшення ми перейшли ліміт
    if (record.count > limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: Math.max(0, limit - record.count) };
  } catch (error) {
    console.error('Rate limit error:', error);
    // CWE-636: Not Failing Securely. Якщо БД впала, краще заблокувати доступ (Fail-Closed),
    // ніж пропустити атакуючого (Fail-Open).
    throw new Error('Помилка перевірки ліміту запитів');
  }
}

export async function clearRateLimit(key: string) {
  try {
    await prisma.rateLimit.delete({ where: { key } }).catch(() => null);
  } catch (e) {}
}
