import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { z } from 'zod';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

  if (!isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Дія доступна тільки для процесного аналітика або адміністратора' }, { status: 403 });
  }

  const { id } = await params;
  const process = await prisma.process.findUnique({ where: { id } });
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 });

  const rawBody = await req.json().catch(() => ({}));
  const archiveSchema = z.object({
    action: z.enum(['ARCHIVE', 'RESTORE']).optional(),
    comment: z.string().max(1000, 'Коментар занадто довгий').optional()
  });
  
  const parseResult = archiveSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  
  const action = parseResult.data.action === 'RESTORE' ? 'RESTORE' : 'ARCHIVE';
  const comment = parseResult.data.comment || (action === 'ARCHIVE' ? 'Переміщено в архів' : 'Відновлено з архіву');

  const newStatus = action === 'ARCHIVE' ? 'ARCHIVED' : 'APPROVED';

  const updated = await prisma.process.update({
    where: { id },
    data: { status: newStatus },
  });

  await prisma.processHistoryLog.create({
    data: {
      processId: id,
      action: action === 'ARCHIVE' ? 'В_АРХІВІ' : 'ВІДНОВЛЕНО',
      userId: session.id,
      comment,
    },
  });

  return NextResponse.json({ success: true, status: updated.status });
}
