import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canViewAdminPanel } from '@/lib/permissions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  const { id } = await params
  const { name, adminId } = await req.json()
  const level = await prisma.processLevel.update({
    where: { id },
    data: { ...(name ? { name } : {}), adminId: adminId ?? undefined },
  })
  return NextResponse.json(level)
}
