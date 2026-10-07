// src/lib/auth.ts
// Mock-авторизація через cookie. Замінюється на реальну auth без змін інтерфейсу.
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from './prisma'
import type { User } from '@prisma/client';
import { Role } from './enums';

export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'forcePasswordReset'>

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
        authMethod: sessionRecord.authMethod,
        authenticatedAt: sessionRecord.authenticatedAt // CWE-287: Зберігаємо оригінальний час для Sudo
      }
    })
    
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
    
    return signValue(newSession.id, expiresAtMs)
  }
  
  return null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE)?.value

  if (!cookieValue) return null

  const sessionId = verifyValue(cookieValue)
  if (!sessionId) return null

  const sessionRecord = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: { select: { id: true, email: true, fullName: true, role: true, forcePasswordReset: true } } }
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
export async function buildSessionCookieValue(
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
      authMethod: authMethod as any
    }
  });
  return signValue(session.id, expiresAtMs);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE


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
    include: { user: { select: { id: true, email: true, fullName: true, role: true, forcePasswordReset: true } } }
  })
  
  const now = new Date()
  if (!sessionRecord || sessionRecord.expiresAt < now) return { user: null, sudoRequired: false }
  
  // Sudo вікно - 15 хвилин з моменту реального вводу пароля
  const isSudo = now.getTime() - sessionRecord.authenticatedAt.getTime() <= 15 * 60 * 1000;
  return { user: sessionRecord.user, sudoRequired: !isSudo };
}


/**
 * Перевірка поточного пароля для критичних операцій (CWE-287)
 */
export async function verifyCurrentPassword(userId: string, password: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return false;

  if (user.authSource === 'LDAP' && process.env.LDAP_URL) {
    try {
      const { authenticate } = require('ldap-authentication');
      const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName';
      const baseFilter = process.env.LDAP_SEARCH_FILTER;
      const escapedEmail = user.email.replace(/[\\*()\0]/g, (c: string) => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));
      
      let usernameFilter: string | undefined = undefined;
      if (baseFilter) {
        usernameFilter = `(&${baseFilter}(${usernameAttribute}=${escapedEmail}))`;
      } else {
        usernameFilter = `(${usernameAttribute}=${escapedEmail})`;
      }

      const authOptions: any = {
        ldapOpts: { url: process.env.LDAP_URL },
        userPassword: password,
        userSearchBase: process.env.LDAP_BASE_DN || '',
        usernameAttribute,
        usernameFilter,
        username: user.email,
      };

      if (process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD) {
        authOptions.adminDn = process.env.LDAP_BIND_DN;
        authOptions.adminPassword = process.env.LDAP_BIND_PASSWORD;
      } else {
        authOptions.userDn = user.email;
      }

      await authenticate(authOptions);
      return true;
    } catch (e) {
      return false;
    }
  }

  const bcrypt = require('bcrypt');
  return bcrypt.compare(password, user.password);
}
