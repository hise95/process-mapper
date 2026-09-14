// src/app/api/processes/[id]/approve/route.ts
// POST — виконати перехід workflow (погодження / відхилення)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { applyTransition, canTransition, type WorkflowTransition } from '@/lib/workflow'
import { ProcessStatus } from '@/lib/enums'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

  const { transition, comment }: { transition: WorkflowTransition; comment?: string } = await req.json()

  if (!canTransition(session, process.status as ProcessStatus, transition, process.ownerId)) {
    return NextResponse.json({ error: 'Дія недоступна для вашої ролі або поточного статусу процесу' }, { status: 403 })
  }

  await applyTransition(id, transition, session, comment)

  return NextResponse.json({ success: true })
}
