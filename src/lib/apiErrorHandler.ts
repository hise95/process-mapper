import { NextResponse } from 'next/server';

export function handleApiError(error: any, context?: string) {
  // Prisma Known Error Codes
  if (error?.code && typeof error.code === 'string' && error.code.startsWith('P')) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json({ error: 'Запис з такими даними вже існує (Конфлікт).' }, { status: 409 });
      case 'P2025':
        return NextResponse.json({ error: 'Ресурс не знайдено.' }, { status: 404 });
      case 'P2003':
      case 'P2014':
        return NextResponse.json({ error: 'Неможливо виконати операцію через пов\'язані дані.' }, { status: 400 });
      case 'P2023':
        return NextResponse.json({ error: 'Некоректний формат даних (наприклад, невалідний ID).' }, { status: 400 });
      default:
        return NextResponse.json({ error: 'Помилка обробки даних бази.' }, { status: 400 });
    }
  }

  if (error?.name === 'ZodError') {
    return NextResponse.json({ error: 'Некоректні дані', details: error.errors }, { status: 400 });
  }

  // CWE-209: Minimal logging for 500s to avoid spam and sensitive data disclosure
  console.error(`[API Error] ${context || ''}:`, error?.message || 'Unknown error');
  return NextResponse.json({ error: 'Внутрішня помилка сервера' }, { status: 500 });
}
