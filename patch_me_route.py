import sys

with open("src/app/api/auth/me/route.ts", "r") as f:
    code = f.read()

import re

old_me = """import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  }
  return NextResponse.json(session)
}"""

new_me = """import { NextResponse } from 'next/server'
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
}"""

if old_me in code:
    code = code.replace(old_me, new_me)
    with open("src/app/api/auth/me/route.ts", "w") as f:
        f.write(code)
    print("Patched /api/auth/me/route.ts")
else:
    print("Could not find /api/auth/me block")
