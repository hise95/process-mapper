import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  const { id } = await params;
  const { status, adminComment } = await req.json();

  const feedback = await prisma.feedback.update({
    where: { id },
    data: {
      status,
      adminComment
    }
  });

  // Notify the user who created the feedback
  if (status === 'RESOLVED') {
    await prisma.notification.create({
      data: {
        userId: feedback.userId,
        title: 'Ваше звернення опрацьовано',
        message: adminComment 
          ? `Адміністратор залишив коментар: "${adminComment}"`
          : 'Ваше звернення було успішно вирішене адміністратором.',
        linkUrl: null
      }
    });
  }

  return NextResponse.json(feedback);
}
