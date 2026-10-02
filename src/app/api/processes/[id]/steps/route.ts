// src/app/api/processes/[id]/steps/route.ts
// GET — список кроків процесу
// POST — додати крок
// PUT — масове оновлення (reorder після drag & drop)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canEditSteps } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const steps = await prisma.processStep.findMany({
    where: { processId: id },
    orderBy: { orderIndex: 'asc' },
  })
  return NextResponse.json(steps)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditSteps(session, process)) return NextResponse.json({ error: 'Редагування кроків на цій фазі недоступне' }, { status: 403 })

  const body = await req.json()

  // Визначити наступний orderIndex
  const lastStep = await prisma.processStep.findFirst({
    where: { processId: id },
    orderBy: { orderIndex: 'desc' },
  })
  const nextIndex = (lastStep?.orderIndex ?? 0) + 1

  const step = await prisma.processStep.create({
    data: {
      processId: id,
      orderIndex: body.orderIndex ?? nextIndex,
      phase: body.phase ?? null,
      name: body.name ?? 'Новий крок',
      description: body.description ?? null,
      executorRole: body.executorRole ?? null,
      participantsNote: body.participantsNote ?? null,
      docUrl: body.docUrl ?? null,
      comment: body.comment ?? null,
    },
  })

  return NextResponse.json(step, { status: 201 })
}

/** PUT — масове переупорядкування або оновлення кроків */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditSteps(session, process)) return NextResponse.json({ error: 'Редагування кроків на цій фазі недоступне' }, { status: 403 })

  const body: Array<{ id: string; orderIndex: number; name?: string; description?: string; executorRole?: string; participantsNote?: string; docUrl?: string; comment?: string; phase?: string }> = await req.json()

  await prisma.$transaction(
    body.map((step) =>
      prisma.processStep.update({
        where: { id: step.id, processId: id },
        data: {
          orderIndex: step.orderIndex,
          ...(step.name !== undefined ? { name: step.name } : {}),
          ...(step.description !== undefined ? { description: step.description } : {}),
          ...(step.executorRole !== undefined ? { executorRole: step.executorRole } : {}),
          ...(step.participantsNote !== undefined ? { participantsNote: step.participantsNote } : {}),
          ...(step.docUrl !== undefined ? { docUrl: step.docUrl } : {}),
          ...(step.comment !== undefined ? { comment: step.comment } : {}),
          ...(step.phase !== undefined ? { phase: step.phase } : {}),
        },
      })
    )
  )

  return NextResponse.json({ success: true })
}
