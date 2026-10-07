// src/app/api/process-levels/route.ts
// GET — дерево рівнів (L1 → L2 → L3)
// POST — створити рівень (тільки PROCESS_ANALYST)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canViewAdminPanel } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const includeAll = req.nextUrl.searchParams.get('all') === 'true'
  const processWhere = includeAll ? {} : { status: 'APPROVED' }

  // Отримати тільки L1, з вкладеними L2 та їх L3
  const levels = await prisma.processLevel.findMany({
    where: { depth: 1 },
    include: {
      processes: {
        where: processWhere as any,
        select: { id: true, title: true, code: true, version: true, status: true },
      },
      children: {
        include: {
          children: {
            include: {
              processes: {
                where: processWhere as any,
                select: { id: true, title: true, code: true, version: true, status: true },
              },
            },
          },
          processes: {
            where: processWhere as any,
            select: { id: true, title: true, code: true, version: true, status: true },
          },
        },
        orderBy: { name: 'asc' },
      },
      admin: { select: { id: true, fullName: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(levels)
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const { name, parentId, adminId } = await req.json()
  if (!name) return NextResponse.json({ error: 'Назва рівня обов\'язкова' }, { status: 400 })

  // Визначити глибину
  let depth = 1
  if (parentId) {
    const parent = await prisma.processLevel.findUnique({ where: { id: parentId } })
    if (!parent) return NextResponse.json({ error: 'Батьківський рівень не знайдено' }, { status: 404 })
    depth = parent.depth + 1
    if (depth > 3) return NextResponse.json({ error: 'Максимальна глибина ієрархії — 3 рівні' }, { status: 400 })
  }

  const level = await prisma.processLevel.create({
    data: { name, depth, parentId: parentId ?? null, adminId: adminId ?? null },
  })

  return NextResponse.json(level, { status: 201 })
}
