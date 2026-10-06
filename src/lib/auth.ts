// src/lib/auth.ts
// Mock-авторизація через cookie. Замінюється на реальну auth без змін інтерфейсу.
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'
import type { User } from '@prisma/client';
import { Role } from './enums';

export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role'>

const SESSION_COOKIE = 'pm-session'
const SESSION_SECRET = process.env.SESSION_SECRET as string


// ---------------------------------------------------------------------------
function requireValidSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('FATAL: SESSION_SECRET environment variable is missing or too weak (must be at least 32 characters for HMAC-SHA256).')
  }
}

// ---------------------------------------------------------------------------
// HMAC helpers
// ---------------------------------------------------------------------------

function signValue(sessionId: string, expiresAt: number): string {
  requireValidSecret();
  const payload = `${sessionId}.${expiresAt}`;
  const sig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyValue(cookieValue: string): string | null {
  requireValidSecret();
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return null;

  const [userId, expiresAtStr, providedSig] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);
  
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return null; // Expired
  }

  const payload = `${userId}.${expiresAt}`;
  const expectedSig = createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

  try {
    const expectedBuffer = Buffer.from(expectedSig, 'hex');
    const providedBuffer = Buffer.from(providedSig, 'hex');
    if (expectedBuffer.length !== providedBuffer.length) return null;
    if (!timingSafeEqual(expectedBuffer, providedBuffer)) return null;
  } catch (e) {
    return null;
  }
  
  return userId;
}

// ---------------------------------------------------------------------------
// Session API
// ---------------------------------------------------------------------------

/**
 * Отримати поточну сесію з cookie.
 * Повертає null, якщо користувач не авторизований.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value

  if (!cookieValue) return null

  const sessionId = verifyValue(cookieValue)
  if (!sessionId) return null

  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, fullName: true, role: true } } }
  })

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    return null
  }

  return sessionRecord.user
}

/**
 * Отримати сесію або кинути помилку (для захищених Server Components).
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

/**
 * Перевірити роль.
 */
export function hasRole(user: SessionUser, ...roles: Role[]): boolean {
  return roles.includes(user.role as Role)
}

/**
 * Встановити сесію (викликається в Route Handler після вибору ролі).
 * Повертає HMAC-підписане значення cookie.
 */
export async function buildSessionCookieValue(userId: string): Promise<string> {
  const expiresAtMs = Date.now() + 1000 * 60 * 60 * 8; // 8 hours
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(expiresAtMs)
    }
  });
  return signValue(session.id, expiresAtMs);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
