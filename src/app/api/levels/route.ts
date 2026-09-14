// src/app/api/levels/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });

  const levels = await prisma.processLevel.findMany({
    orderBy: [{ depth: 'asc' }, { name: 'asc' }],
    include: { parent: { select: { name: true } } }
  });

  return NextResponse.json(levels);
}
