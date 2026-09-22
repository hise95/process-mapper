import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const { id } = await params;
  const { status, title, description, assigneeId } = await req.json();

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
