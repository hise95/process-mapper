// src/app/api/processes/[id]/version/route.ts
// POST — створити нову версію APPROVED процесу (редагування затвердженого)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canCreateNewVersion } from '@/lib/permissions'
import { createNewVersion } from '@/lib/workflow'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

  if (!canCreateNewVersion(session, process)) {
    return NextResponse.json({ error: 'Нову версію може створити тільки менеджер або аналітик для затвердженого процесу' }, { status: 403 })
  }

  const existingNext = await prisma.process.findFirst({
    where: { previousVersionId: id, status: { not: 'ARCHIVED' } },
    select: { id: true }
  })
  if (existingNext) {
    return NextResponse.json({ error: 'Чернетка нової версії вже створена', newVersionId: existingNext.id }, { status: 409 })
  }

  const newId = await createNewVersion(id, session)

  return NextResponse.json({ newVersionId: newId }, { status: 201 })
}
