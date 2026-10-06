import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { initialArchitectureData } from '@/lib/architectureData';
import { prisma } from '@/lib/prisma';

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

function validateArchitectureData(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Очікується об`єкт JSON');
  }

  // CWE-400: Logical size limit
  const str = JSON.stringify(body);
  if (str.length > 500 * 1024) {
    throw new Error('Дані занадто великі (максимум 500KB)');
  }

  if (body.cards !== undefined && !Array.isArray(body.cards)) {
    throw new Error('Поле cards має бути масивом');
  }

  const cards = body.cards || [];

  // CWE-400: Element count limit
  if (cards.length > 1000) {
    throw new Error('Перевищено ліміт карток (максимум 1000)');
  }

  // Schema validation
  for (const card of cards) {
    if (!card || typeof card !== 'object') {
      throw new Error('Картка має бути об`єктом');
    }
    if (!card.id || typeof card.id !== 'string' || card.id.length > 100) {
      throw new Error('Некоректний або занадто довгий id картки');
    }
    if (!['mgmt', 'main', 'supp'].includes(card.group)) {
      throw new Error('Некоректна група картки (має бути mgmt, main або supp)');
    }
    if (card.title !== undefined && (typeof card.title !== 'string' || card.title.length > 500)) {
      throw new Error('Некоректна або занадто довга назва картки');
    }
    
    // Arrays validation
    for (const field of ['inputs', 'outputs']) {
      if (card[field] !== undefined) {
        if (!Array.isArray(card[field])) throw new Error(`Поле ${field} має бути масивом`);
        if (card[field].length > 150) throw new Error(`Забагато елементів у ${field}`);
        for (const item of card[field]) {
          if (typeof item !== 'string' || item.length > 1000) {
            throw new Error(`Елемент у ${field} має бути рядком до 1000 символів`);
          }
        }
      }
    }
  }
}

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    // Перевірка схеми, розміру та вкладеності (CWE-400 / Point 23)
    try {
      validateArchitectureData(body);
    } catch (valErr: any) {
      return NextResponse.json({ error: valErr.message }, { status: 400 });
    }
    
    await prisma.architectureDataStorage.upsert({
      where: { id: 'singleton' },
      update: { data: body as any },
      create: { id: 'singleton', data: body as any },
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
