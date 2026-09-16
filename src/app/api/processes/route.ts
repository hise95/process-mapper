// src/app/api/processes/route.ts
// GET — список процесів (з фільтрацією по ролі)
// POST — створити новий процес
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canCreateProcess } from '@/lib/permissions'
import { Role } from '../../../lib/enums';

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const levelId = searchParams.get('levelId')

  const pending = searchParams.get('pending')

  // Побудова фільтра за роллю
  const where: Record<string, unknown> = {}

  if (pending === 'true') {
    if (session.role === Role.PROCESS_ANALYST || session.role === Role.ADMIN_ANALYST || session.role === Role.ADMIN) {
      where.status = { in: ['PASSPORT_REVIEW_ANALYST', 'STEPS_REVIEW_ANALYST', 'KPIS_REVIEW_ANALYST', 'FINAL_APPROVAL_ANALYST'] }
    } else if (session.role === Role.PROCESS_OWNER) {
      where.status = { in: ['PASSPORT_REVIEW_OWNER', 'STEPS_REVIEW_OWNER', 'KPIS_REVIEW_OWNER'] }
      where.ownerId = session.id
    }
  } else if (status) {
    where.status = status
  } else {
    // Якщо статус не вказано, ховаємо архівовані версії з загальних списків
    where.status = { not: 'ARCHIVED' }
    if (session.role === Role.PROCESS_MANAGER) {
      // Менеджер бачить тільки свої процеси
      where.managerId = session.id
    } else if (session.role === Role.PROCESS_OWNER) {
      // Власник бачить свої процеси
      where.ownerId = session.id
    }
  }

  if (levelId) where.levelId = levelId

  const processes = await prisma.process.findMany({
    where,
    include: {
      owner: { select: { id: true, fullName: true } },
      manager: { select: { id: true, fullName: true } },
      level: { select: { id: true, name: true, depth: true } },
      steps: { orderBy: { orderIndex: 'asc' } },
      kpis: true,
      _count: { select: { steps: true, kpis: true } },
      historyLogs: {
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { fullName: true } } }
      }
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(processes)
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canCreateProcess(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const body = await req.json()
  const { title, processType, levelId, ownerId, managerId } = body

  if (!title) return NextResponse.json({ error: 'Назва процесу обов\'язкова' }, { status: 400 })

  // Перевірити що рівень L2 або L3
  if (levelId) {
    const level = await prisma.processLevel.findUnique({ where: { id: levelId } })
    if (level && level.depth < 2) {
      return NextResponse.json({ error: 'Процес можна прив\'язати тільки до рівня L2 або L3' }, { status: 400 })
    }
  }

  const process = await prisma.process.create({
    data: {
      title,
      processType: processType ?? 'MAIN',
      levelId: levelId || null,
      ownerId: ownerId || null,
      managerId: managerId || session.id,
      status: 'DRAFT',
      version: 1,
    },
  })

  // Записати в журнал
  await prisma.processHistoryLog.create({
    data: { processId: process.id, action: 'СТВОРЕНО', userId: session.id },
  })

  return NextResponse.json(process, { status: 201 })
}
