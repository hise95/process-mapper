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

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isAnalystOrAdmin(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
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
