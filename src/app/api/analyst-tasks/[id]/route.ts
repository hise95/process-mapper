import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { analystTaskSchema } from '@/lib/schemas';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const { id } = await params;
  const rawBody = await req.json();
  const parseResult = analystTaskSchema.partial().safeParse(rawBody);
  
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  
  const { status, title, description, assigneeId } = parseResult.data;

  const task = await prisma.analystTask.update({
    where: { id },
    data: { status, title, description, assigneeId },
    include: { assignee: { select: { fullName: true } } }
  });

  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const { id } = await params;

  await prisma.analystTask.delete({
    where: { id }
  });

  return NextResponse.json({ success: true });
}
