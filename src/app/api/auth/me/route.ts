// src/app/api/auth/me/route.ts
// GET — повертає дані поточної сесії
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  }
  return NextResponse.json(session)
}
