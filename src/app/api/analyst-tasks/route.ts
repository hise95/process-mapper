import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

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

  const { title, description, assigneeId } = await req.json();
  if (!title) return NextResponse.json({ error: 'Заголовок обов\'язковий' }, { status: 400 });

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
