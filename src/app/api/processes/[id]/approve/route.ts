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

  await applyTransition(id, transition, session, comment)

  return NextResponse.json({ success: true })
}
