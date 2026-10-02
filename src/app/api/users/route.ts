import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canViewAdminPanel } from '@/lib/permissions'
import { Role } from '../../../lib/enums'
import bcrypt from 'bcrypt'

export async function GET(_req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може створювати користувачів' }, { status: 403 })

  const { email, password, fullName, role } = await req.json()
  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: 'Всі поля обов\'язкові' }, { status: 400 })
  }

  const validRoles = Object.values(Role)
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Недійсна роль' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Користувач з таким email вже існує' }, { status: 400 })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, fullName, role },
    select: { id: true, email: true, fullName: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const { userId, role, password, email, fullName } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId обов\'язковий' }, { status: 400 })

  const dataToUpdate: any = {}

  if (role) {
    // Не можна змінити роль самому собі
    if (userId === session.id) {
      return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 400 })
    }
    const validRoles = Object.values(Role)
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Недійсна роль' }, { status: 400 })
    }
    dataToUpdate.role = role
  }

  // Тільки адміністратор може міняти пароль або email іншим
  if (password || email || fullName) {
    if (session.role !== 'ADMIN') {
       return NextResponse.json({ error: 'Тільки системний адміністратор може змінювати дані користувача' }, { status: 403 })
    }
    if (password) dataToUpdate.password = await bcrypt.hash(password, 12)
    if (email) dataToUpdate.email = email
    if (fullName) dataToUpdate.fullName = fullName
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: { id: true, email: true, fullName: true, role: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може видаляти користувачів' }, { status: 403 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId обов\'язковий' }, { status: 400 })
  if (userId === session.id) return NextResponse.json({ error: 'Не можна видалити самого себе' }, { status: 400 })

  await prisma.user.delete({
    where: { id: userId },
  })

  return NextResponse.json({ success: true })
}
