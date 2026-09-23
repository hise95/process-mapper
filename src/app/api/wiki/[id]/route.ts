import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isAnalystOrAdmin } from '@/lib/permissions';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !isAnalystOrAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, icon, content, order } = await req.json();

    const updatedPage = await prisma.wikiPage.update({
      where: { id: params.id },
      data: {
        title,
        icon,
        content,
        order
      }
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating wiki page:', error);
    return NextResponse.json({ error: 'Failed to update wiki page' }, { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const session = await getSession();
    if (!session || !isAnalystOrAdmin(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.wikiPage.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wiki page:', error);
    return NextResponse.json({ error: 'Failed to delete wiki page' }, { status: 500 });
  }
}
