import { z } from "zod";
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { applyTransition, canExecuteTransition, type WorkflowTransition } from '@/lib/workflow'
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

  const rawBody = await req.json().catch(() => ({}));
  const approveSchema = z.object({
    transition: z.string(),
    comment: z.string().max(1000, 'Коментар занадто довгий').optional().nullable()
  });
  
  const parseResult = approveSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  
  const transition = parseResult.data.transition as WorkflowTransition;
  const comment = parseResult.data.comment || undefined;

  if (!canExecuteTransition(transition, process.status as ProcessStatus, session, process)) {
    return NextResponse.json({ error: 'Дія заборонена для вашої ролі або поточного статусу процесу' }, { status: 403 })
  }

  try {
    // Передаємо process.status як expectedCurrentStatus для OCC-захисту (CWE-362)
    await applyTransition(id, transition, session, comment, process.status)
  } catch (err: any) {
    if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
      return NextResponse.json({ error: 'Конфлікт паралельних запитів: статус вже змінено' }, { status: 409 })
    }
    throw err;
  }

  return NextResponse.json({ success: true })
}
