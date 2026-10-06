import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';
import { wikiPageSchema } from '@/lib/schemas';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  }

  try {
    let pages = await prisma.wikiPage.findMany({
      orderBy: { order: 'asc' }
    });
    
    // Auto-seed if empty
    if (pages.length === 0) {
      const WIKI_SECTIONS = [
        { id: 'bpmn', title: 'Як правильно малювати BPMN', icon: 'HelpCircle', order: 1, content: '<div class="space-y-4"><h2 class="text-xl font-semibold mb-4">Основи моделювання в BPMN</h2><p>BPMN (Business Process Model and Notation) — це стандарт для моделювання бізнес-процесів.</p><ul><li>Події (Кружечки)</li><li>Задачі (Прямокутники)</li><li>Шлюзи (Ромби)</li><li>Доріжки (Pools & Lanes)</li></ul></div>' },
        { id: 'kpis', title: 'Як визначати показники', icon: 'Activity', order: 2, content: '<div class="space-y-4"><h2 class="text-xl font-semibold mb-4">Визначення показників процесу</h2><p>Показники допомагають зрозуміти, наскільки ефективно працює процес.</p><ul><li>Показники часу</li><li>Показники якості</li><li>Показники вартості</li></ul></div>' },
        { id: 'passport', title: 'Заповнення паспорта процесу', icon: 'FileText', order: 3, content: '<div class="space-y-4"><h2 class="text-xl font-semibold mb-4">Що таке паспорт процесу?</h2><p>Паспорт — це базовий документ, який описує суть процесу.</p></div>' },
        { id: 'roles', title: 'Ролі та права доступу', icon: 'Users', order: 4, content: '<div class="space-y-4"><h2 class="text-xl font-semibold mb-4">Матриця ролей в системі</h2><ul><li>👑 Адміністратор / Аналітик</li><li>👔 Власник процесу</li><li>💼 Менеджер процесу</li><li>👥 Працівник</li></ul></div>' },
        { id: 'approvals', title: 'Як працює погодження', icon: 'CheckCircle', order: 5, content: '<div class="space-y-4"><h2 class="text-xl font-semibold mb-4">Життєвий цикл процесу</h2><ol><li>Фаза 1: Паспорт.</li><li>Фаза 2: Кроки (BPMN).</li><li>Фаза 3: Показники.</li></ol></div>' }
      ];
      
      await prisma.wikiPage.createMany({ data: WIKI_SECTIONS });
      pages = await prisma.wikiPage.findMany({ orderBy: { order: 'asc' } });
    }
    
    return NextResponse.json(pages);
  } catch (error) {
    console.error('Error fetching wiki pages:', error);
    return NextResponse.json({ error: 'Failed to fetch wiki pages' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !isAnalystOrAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // CWE-20: Schema validation (Point 24)
    const parsed = wikiPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некоректні дані', details: parsed.error.format() }, { status: 400 });
    }
    
    const { id, title, icon, content, order } = parsed.data;

    const newPage = await prisma.wikiPage.create({
      data: {
        id: id || crypto.randomUUID(), // Якщо id не передано, генеруємо безпечно
        title,
        icon: icon || 'FileText',
        content: content || '',
        order: order || 0
      }
    });

    return NextResponse.json(newPage);
  } catch (error) {
    console.error('Error creating wiki page:', error);
    return NextResponse.json({ error: 'Failed to create wiki page' }, { status: 500 });
  }
}
