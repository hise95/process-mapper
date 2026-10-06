import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

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
    return NextResponse.json({ error: 'Помилка завантаження рівнів' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (!isAnalystOrAdmin(session.role)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });

  try {
    const { name, parentId } = await req.json();
    if (!name) return NextResponse.json({ error: 'Назва обовʼязкова' }, { status: 400 });

    let depth = 1;
    if (parentId) {
      const parent = await prisma.processLevel.findUnique({ where: { id: parentId } });
      if (parent) {
        depth = parent.depth + 1;
      }
    }

    const level = await prisma.processLevel.create({
      data: {
        name,
        depth,
        parentId: parentId || null
      }
    });
    return NextResponse.json(level, { status: 201 });
  } catch (error) {
    console.error('Error creating level:', error);
    return NextResponse.json({ error: 'Помилка створення рівня' }, { status: 500 });
  }
}
