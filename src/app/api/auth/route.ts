// src/app/api/auth/route.ts
// Mock-авторизація: встановлює cookie з userId вибраного користувача
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE_NAME } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email та пароль обов\'язкові' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, password: true, fullName: true, role: true },
  })

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
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
