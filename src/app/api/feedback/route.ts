import { handleApiError } from '@/lib/apiErrorHandler';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { feedbackSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rateLimit';

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

  // CWE-400: Захист від спаму фідбеком (Rate Limit)
  // Дозволяємо не більше 5 відгуків за 10 хвилин для одного користувача
  const limit = await checkRateLimit(`feedback_user_${session.id}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Ви надсилаєте занадто багато відгуків. Спробуйте пізніше.' }, { status: 429 });
  }

  const rawBody = await req.json();
  const parseResult = feedbackSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  const { type, message } = parseResult.data;

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
  } catch (error: any) {
    return handleApiError(error);
  }
}
