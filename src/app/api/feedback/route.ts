import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const feedbacks = await prisma.feedback.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { fullName: true, role: true } } }
  });

  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

  const { type, message } = await req.json();
  if (!type || !message) return NextResponse.json({ error: 'Заповніть всі поля' }, { status: 400 });

  try {
    const feedback = await prisma.feedback.create({
      data: {
        type,
        message,
        userId: session.id,
        status: 'OPEN'
      }
    });
    return NextResponse.json(feedback);
  } catch (error) {
    console.error("Feedback creation error:", error);
    return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
  }
}
