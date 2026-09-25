// src/app/api/users/route.ts
// GET — список користувачів (для вибору owner/manager)
// PATCH — змінити роль або рівень (тільки PROCESS_ANALYST)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canViewAdminPanel } from '@/lib/permissions'
import { Role } from '../../../lib/enums';

export async function GET(_req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const { userId, role } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId обов\'язковий' }, { status: 400 })

  // Не можна змінити роль самому собі
  if (userId === session.id) {
    return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 400 })
  }

  const validRoles = Object.values(Role)
  if (role && !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Недійсна роль' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { ...(role ? { role } : {}) },
    select: { id: true, email: true, fullName: true, role: true },
  })

  return NextResponse.json(updated)
}
