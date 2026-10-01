import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/auth'
import { authenticate } from 'ldap-authentication'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email та пароль обов\'язкові' }, { status: 400 })
    }

    let authenticatedViaLdap = false
    let ldapFullName = null

    // 1. Спроба авторизації через LDAP (якщо налаштовано)
    if (process.env.LDAP_URL) {
      try {
        const ldapUser = await authenticate({
          ldapOpts: { url: process.env.LDAP_URL },
          // В Active Directory email (UPN) можна використовувати напряму для bind
          userDn: email,
          userPassword: password,
          userSearchBase: process.env.LDAP_BASE_DN || '',
          usernameAttribute: process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName',
          username: email,
        })
        authenticatedViaLdap = true
        // Намагаємось витягнути повне ім'я з LDAP
        if (ldapUser && (ldapUser.displayName || ldapUser.cn)) {
          ldapFullName = ldapUser.displayName || ldapUser.cn
        }
      } catch (error: any) {
        console.warn('LDAP auth failed for', email, ':', error?.message)
        // Продовжуємо, щоб спробувати локальну базу
      }
    }

    // 2. Перевірка локальної бази
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, fullName: true, role: true },
    })

    // Якщо база порожня або користувача немає, створюємо тестові акаунти на льоту (для демо-режиму)
    if (!user) {
      const count = await prisma.user.count()
      if (count === 0) {
        await prisma.user.createMany({
          data: [
            { email: 'admin@company.com', password: 'password123', fullName: 'Системний Адміністратор', role: 'ADMIN' },
            { email: 'analyst@company.com', password: 'password123', fullName: 'Іваненко Олена (Процесний аналітик)', role: 'PROCESS_ANALYST' },
            { email: 'owner@company.com', password: 'password123', fullName: 'Шевченко Василь (Власник процесу)', role: 'PROCESS_OWNER' },
            { email: 'manager@company.com', password: 'password123', fullName: 'Коваленко Микола (Менеджер процесу)', role: 'PROCESS_MANAGER' },
            { email: 'employee@company.com', password: 'password123', fullName: 'Петренко Анна (Працівник)', role: 'EMPLOYEE' },
          ],
        })
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, password: true, fullName: true, role: true },
        })
      }
    }

    if (authenticatedViaLdap) {
      // Якщо авторизувались через LDAP, але користувача немає в локальній базі, створюємо його
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            password: 'ldap-managed', // пароль не використовується, бо є LDAP
            fullName: ldapFullName || email.split('@')[0],
            role: 'EMPLOYEE', // базова роль за замовчуванням
          },
        })
      }
    } else {
      // Якщо LDAP вимкнено або не спрацювало, перевіряємо локальний пароль
      if (!user || user.password !== password) {
        return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
      }
    }

    const response = NextResponse.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } })
    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 годин
    })

    return response
  } catch (error: any) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: error?.message || 'Помилка авторизації на сервері' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
