// src/app/api/levels/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

  try {
    const levels = await prisma.processLevel.findMany({
      orderBy: [{ depth: 'asc' }, { name: 'asc' }],
      include: { parent: { select: { name: true } } }
    });
    return NextResponse.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    return NextResponse.json({ error: 'Помилка сервера при завантаженні рівнів' }, { status: 500 });
  }
}
