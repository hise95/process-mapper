// PATCH + DELETE a single step
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canEditSteps } from '@/lib/permissions'

type Params = { params: Promise<{ id: string; stepId: string }> }

const ALLOWED_STEP_FIELDS = ['name', 'description', 'executorRole', 'docUrl', 'comment', 'phase'] as const;
type AllowedField = typeof ALLOWED_STEP_FIELDS[number];

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  const { id, stepId } = await params
  const proc = await prisma.process.findUnique({ where: { id } })
  if (!proc) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditSteps(session, proc)) return NextResponse.json({ error: 'Редагування кроків на цій фазі недоступне' }, { status: 403 })

  const body = await req.json()
  // Дозволяємо оновлювати тільки безпечні поля
  const data: Partial<Record<AllowedField, string>> = {}
  for (const field of ALLOWED_STEP_FIELDS) {
    if (field in body) data[field] = body[field]
  }

  const updated = await prisma.processStep.update({ where: { id: stepId, processId: id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  const { id, stepId } = await params
  const proc = await prisma.process.findUnique({ where: { id } })
  if (!proc) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditSteps(session, proc)) return NextResponse.json({ error: 'Редагування кроків на цій фазі недоступне' }, { status: 403 })
  await prisma.processStep.delete({ where: { id: stepId, processId: id } })
  return NextResponse.json({ success: true })
}
