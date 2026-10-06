// src/lib/auth.ts
// Mock-авторизація через cookie. Замінюється на реальну auth без змін інтерфейсу.
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { prisma } from './prisma'
import type { User } from '@prisma/client';
import { Role } from './enums';

export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role'>

const SESSION_COOKIE = 'pm-session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-in-production'

// ---------------------------------------------------------------------------
// HMAC helpers
// ---------------------------------------------------------------------------

function signValue(userId: string): string {
  const sig = createHmac('sha256', SESSION_SECRET).update(userId).digest('hex')
  return `${userId}.${sig}`
}

function verifyValue(cookieValue: string): string | null {
  const dotIndex = cookieValue.lastIndexOf('.')
  if (dotIndex === -1) return null

  const userId = cookieValue.slice(0, dotIndex)
  const providedSig = cookieValue.slice(dotIndex + 1)
  const expectedSig = createHmac('sha256', SESSION_SECRET).update(userId).digest('hex')

  // Constant-time comparison to prevent timing attacks
  if (providedSig.length !== expectedSig.length) return null
  let diff = 0
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  return diff === 0 ? userId : null
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

  const userId = verifyValue(cookieValue)
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true },
  })

  return user
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
export function buildSessionCookieValue(userId: string): string {
  return signValue(userId)
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
