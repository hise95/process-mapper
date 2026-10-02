import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/auth'
import { authenticate } from 'ldap-authentication'
import bcrypt from 'bcrypt'

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
          userDn: email,
          userPassword: password,
          userSearchBase: process.env.LDAP_BASE_DN || '',
          usernameAttribute: process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName',
          username: email,
        })
        authenticatedViaLdap = true
        if (ldapUser && (ldapUser.displayName || ldapUser.cn)) {
          ldapFullName = ldapUser.displayName || ldapUser.cn
        }
      } catch (error: any) {
        // Не логуємо пароль — тільки email та повідомлення помилки
        console.warn('LDAP auth failed for', email, ':', error?.message)
      }
    }

    // 2. Перевірка локальної бази
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, fullName: true, role: true },
    })

    // Автоматичне створення першого адміна якщо база порожня
    if (!user) {
      const count = await prisma.user.count()
      if (count === 0) {
        const hashed = await bcrypt.hash('password123', 12)
        await prisma.user.createMany({
          data: [
            { email: 'admin@company.com', password: hashed, fullName: 'Системний Адміністратор', role: 'ADMIN' },
            { email: 'analyst@company.com', password: hashed, fullName: 'Іваненко Олена (Процесний аналітик)', role: 'PROCESS_ANALYST' },
            { email: 'owner@company.com', password: hashed, fullName: 'Шевченко Василь (Власник процесу)', role: 'PROCESS_OWNER' },
            { email: 'manager@company.com', password: hashed, fullName: 'Коваленко Микола (Менеджер процесу)', role: 'PROCESS_MANAGER' },
            { email: 'employee@company.com', password: hashed, fullName: 'Петренко Анна (Працівник)', role: 'EMPLOYEE' },
          ],
        })
        user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, password: true, fullName: true, role: true },
        })
      }
    }

    if (authenticatedViaLdap) {
      // LDAP: якщо користувача немає в локальній БД — створюємо
      if (!user) {
        const placeholderHash = await bcrypt.hash(`ldap-${Date.now()}`, 12)
        user = await prisma.user.create({
          data: {
            email,
            password: placeholderHash, // Не використовується, вхід тільки через LDAP
            fullName: ldapFullName || email.split('@')[0],
            role: 'EMPLOYEE',
          },
          select: { id: true, email: true, password: true, fullName: true, role: true },
        })
      }
    } else {
      // Локальна авторизація: перевіряємо bcrypt-хеш
      if (!user) {
        return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
      }
      // Підтримка старих записів (plaintext) та нових (bcrypt)
      const isValidPassword = user.password.startsWith('$2')
        ? await bcrypt.compare(password, user.password)
        : user.password === password // Fallback для існуючих записів у БД

      if (!isValidPassword) {
        return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
      }
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user!.id, email: user!.email, fullName: user!.fullName, role: user!.role }
    })

    response.cookies.set(SESSION_COOKIE_NAME, user!.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 годин
    })

    return response
  } catch (error: any) {
    console.error('Auth error:', error?.message)
    return NextResponse.json({ error: 'Помилка авторизації на сервері' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
