import { handleApiError } from '@/lib/apiErrorHandler';
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
    const pages = await prisma.wikiPage.findMany({
      orderBy: { order: 'asc' }
    });
    
    return NextResponse.json(pages);
  } catch (error: any) {
    return handleApiError(error);
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
  } catch (error: any) {
    return handleApiError(error);
  }
}
