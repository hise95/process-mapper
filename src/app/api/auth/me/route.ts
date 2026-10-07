// src/app/api/auth/me/route.ts
// GET — повертає дані поточної сесії
import { NextResponse } from 'next/server'
import { getSession, rotateSessionIfNeeded, SESSION_COOKIE_NAME } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  }
  
  const response = NextResponse.json(session)
  
  // CWE-384: Виконуємо ротацію сесії, якщо вона старіша за визначений інтервал
  const newCookie = await rotateSessionIfNeeded()
  if (newCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, newCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 годин
    })
  }

  return response
}
