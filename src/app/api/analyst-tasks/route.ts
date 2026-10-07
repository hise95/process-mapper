import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { analystTaskSchema } from '@/lib/schemas';

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const tasks = await prisma.analystTask.findMany({
    orderBy: { createdAt: 'desc' },
    include: { 
      assignee: { select: { fullName: true } },
      author: { select: { fullName: true } }
    }
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const rawBody = await req.json();
  const parseResult = analystTaskSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  const { title, description, assigneeId } = parseResult.data;

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      return NextResponse.json({ error: 'Призначений користувач не існує' }, { status: 400 });
    }
    if (!isAnalystOrAdmin(assignee.role)) {
      return NextResponse.json({ error: 'Задачу можна призначити лише Аналітику або Адміністратору' }, { status: 400 });
    }
  }

  const task = await prisma.analystTask.create({
    data: {
      title,
      description,
      assigneeId,
      authorId: session.id,
      status: 'TODO'
    },
    include: { 
      assignee: { select: { fullName: true } },
      author: { select: { fullName: true } }
    }
  });

  return NextResponse.json(task);
}
