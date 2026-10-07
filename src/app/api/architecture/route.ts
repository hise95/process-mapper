import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { initialArchitectureData } from '@/lib/architectureData';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  try {
    const record = await prisma.architectureDataStorage.findUnique({
      where: { id: 'singleton' }
    });

    if (record && record.data) {
      const data = typeof record.data === 'string' ? JSON.parse(record.data) : record.data;
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      });
    }
    
    // Якщо бази ще немає або вона порожня
    return NextResponse.json(initialArchitectureData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    });
  } catch (error: any) {
    // CWE-209: Information Exposure Through an Error Message
    // Логуємо на сервері, але клієнту віддаємо лише загальне повідомлення без stacktrace та details
    const errorId = crypto.randomUUID();
    console.error(`[${errorId}] Error fetching architecture data:`, error);
    return NextResponse.json(
      { error: 'Внутрішня помилка сервера', errorId }, 
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

const cardSchema = z.object({
  id: z.string().min(1).max(100),
  group: z.enum(['mgmt', 'main', 'supp']),
  code: z.string().max(100).optional().nullable(),
  title: z.string().max(500).optional().nullable(),
  owner: z.string().max(300).optional().nullable(),
  inputs: z.array(z.string().max(1000)).max(150).optional().nullable(),
  outputs: z.array(z.string().max(1000)).max(150).optional().nullable(),
});

const architectureDataSchema = z.object({
  cards: z.array(cardSchema).max(1000)
});

function validateArchitectureData(body: any) {
  // Використовуємо Zod для суворої валідації і заборони unknown properties
  const parseResult = architectureDataSchema.safeParse(body);
  if (!parseResult.success) {
    throw new Error('Некоректні дані: ' + parseResult.error.issues.map((e: any) => e.message).join(', '));
  }
  return parseResult.data;
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Перевірка схеми, розміру та вкладеності (CWE-400 / Point 23)
    let validatedData;
    try {
      validatedData = validateArchitectureData(body);
    } catch (valErr: any) {
      return NextResponse.json({ error: valErr.message }, { status: 400 });
    }
    
    await prisma.architectureDataStorage.upsert({
      where: { id: 'singleton' },
      update: { data: validatedData as any },
      create: { id: 'singleton', data: validatedData as any },
    });
    
    return NextResponse.json({ success: true, data: body });
  } catch (e) {
    console.error('Error saving architecture data:', e);
    return NextResponse.json({ error: 'Некоректні дані' }, { status: 400 });
  }
}

export async function POST(req: Request) {
  // Скидання до початкового стану
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  try {
    await prisma.architectureDataStorage.upsert({
      where: { id: 'singleton' },
      update: { data: initialArchitectureData as any },
      create: { id: 'singleton', data: initialArchitectureData as any },
    });
    return NextResponse.json({ success: true, data: initialArchitectureData });
  } catch (error) {
    console.error('Error resetting architecture data:', error);
    return NextResponse.json({ error: 'Помилка скидання даних' }, { status: 500 });
  }
}
