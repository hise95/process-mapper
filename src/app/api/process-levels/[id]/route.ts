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
  
  const data: any = {}
  if (name !== undefined) data.name = name
  if (adminId !== undefined) data.adminId = adminId

  const level = await prisma.processLevel.update({
    where: { id },
    data,
  })
  return NextResponse.json(level)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const { id } = await params

  const level = await prisma.processLevel.findUnique({
    where: { id },
    include: {
      children: true,
      processes: true,
    }
  })

  if (!level) {
    return NextResponse.json({ error: 'Рівень не знайдено' }, { status: 404 })
  }

  if (level.children.length > 0) {
    return NextResponse.json({ 
      error: `Неможливо видалити цей рівень: він містить ${level.children.length} підрівнів. Спочатку видаліть їх.` 
    }, { status: 400 })
  }

  // Unlink any processes attached to this level so they don't break
  if (level.processes.length > 0) {
    await prisma.process.updateMany({
      where: { levelId: id },
      data: { levelId: null }
    })
  }

  await prisma.processLevel.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

