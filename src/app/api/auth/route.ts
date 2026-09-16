// src/app/api/auth/route.ts
// Mock-авторизація: встановлює cookie з userId вибраного користувача
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email та пароль обов\'язкові' }, { status: 400 })
    }

    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, fullName: true, role: true },
    })

    // Якщо база порожня або користувача немає, створюємо тестові акаунти на льоту
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

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
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
