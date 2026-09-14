// src/lib/auth.ts
// Mock-авторизація через cookie. Замінюється на реальну auth без змін інтерфейсу.
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { User } from '@prisma/client';
import { Role } from './enums';

export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role'>

const SESSION_COOKIE = 'pm-session'

/**
 * Отримати поточну сесію з cookie.
 * Повертає null, якщо користувач не авторизований.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get(SESSION_COOKIE)?.value

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
 */
export function buildSessionCookieValue(userId: string): string {
  return userId
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
