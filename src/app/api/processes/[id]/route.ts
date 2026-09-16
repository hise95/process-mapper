// src/app/api/processes/[id]/route.ts
// GET — отримати процес по ID
// PATCH — оновити процес
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canEditProcess } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params

  const process = await prisma.process.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, email: true } },
      manager: { select: { id: true, fullName: true, email: true } },
      level: { select: { id: true, name: true, depth: true, parent: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } },
      steps: { orderBy: { orderIndex: 'asc' } },
      kpis: true,
      workflow: { orderBy: { createdAt: 'asc' } },
      historyLogs: {
        include: { user: { select: { id: true, fullName: true } } },
        orderBy: { timestamp: 'desc' },
      },
      previousVersion: { select: { id: true, version: true, status: true } },
      nextVersion: { select: { id: true, version: true, status: true } },
    },
  })

  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

  return NextResponse.json(process)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

  if (!canEditProcess(session, process)) {
    return NextResponse.json({ error: 'Редагування недоступне' }, { status: 403 })
  }

  const body = await req.json()

  // Явно дозволені поля для оновлення (security: whitelist)
  const allowedFields = [
    'title', 'processType', 'code', 'objective', 'input', 'output',
    'participants', 'clients', 'inputSupplier', 'upstreamProcesses',
    'downstreamProcesses', 'bpmnUrl', 'levelId', 'ownerId', 'managerId',
  ]

  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }

  // Перевірити рівень якщо змінюється
  if (data.levelId) {
    const level = await prisma.processLevel.findUnique({ where: { id: data.levelId as string } })
    if (level && level.depth < 2) {
      return NextResponse.json({ error: 'Процес можна прив\'язати тільки до рівня L2 або L3' }, { status: 400 })
    }
  }

  const updated = await prisma.process.update({ where: { id }, data })

  await prisma.processHistoryLog.create({
    data: { processId: id, action: 'ОНОВЛЕНО', userId: session.id },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

  if (process.status !== 'DRAFT') {
    return NextResponse.json({ error: 'Видалити можна тільки чернетки' }, { status: 400 })
  }

  const isAnalystOrAdmin = ['PROCESS_ANALYST', 'ADMIN_ANALYST', 'ADMIN'].includes(session.role)
  if (process.managerId !== session.id && !isAnalystOrAdmin) {
    return NextResponse.json({ error: 'Немає прав на видалення цього процесу' }, { status: 403 })
  }

  await prisma.process.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
