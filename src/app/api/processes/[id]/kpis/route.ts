// src/app/api/processes/[id]/kpis/route.ts
// GET — список KPI процесу
// POST — додати KPI
// PUT — масове оновлення KPI
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canEditKpis, canViewProcess } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id }, select: { status: true, ownerId: true, managerId: true } })
  if (!process) return NextResponse.json({ error: "Процес не знайдено" }, { status: 404 })
  if (!canViewProcess(session, process as any)) return NextResponse.json({ error: "Доступ заборонено" }, { status: 403 })

  const kpis = await prisma.processKPI.findMany({ where: { processId: id } })
  return NextResponse.json(kpis)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditKpis(session, process)) return NextResponse.json({ error: 'Редагування показників на цій фазі недоступне' }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Назва показника обов\'язкова' }, { status: 400 })

  const kpi = await prisma.processKPI.create({
    data: {
      processId: id,
      name: body.name,
      unit: body.unit ?? null,
      dataSource: body.dataSource ?? null,
      frequency: body.frequency ?? null,
      targetValue: body.targetValue ?? null,
    },
  })

  return NextResponse.json(kpi, { status: 201 })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditKpis(session, process)) return NextResponse.json({ error: 'Редагування показників на цій фазі недоступне' }, { status: 403 })

  const body: Array<{ id: string; name: string; unit?: string; dataSource?: string; frequency?: string; targetValue?: string }> = await req.json()

  await prisma.$transaction(
    body.map((kpi) =>
      prisma.processKPI.update({
        where: { id: kpi.id, processId: id },
        data: {
          name: kpi.name,
          unit: kpi.unit ?? null,
          dataSource: kpi.dataSource ?? null,
          frequency: kpi.frequency ?? null,
          targetValue: kpi.targetValue ?? null,
        },
      })
    )
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params
  const { kpiId } = await req.json()

  const process = await prisma.process.findUnique({ where: { id } })
  if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })
  if (!canEditKpis(session, process)) return NextResponse.json({ error: 'Редагування показників на цій фазі недоступне' }, { status: 403 })

  await prisma.processKPI.delete({ where: { id: kpiId, processId: id } })
  return NextResponse.json({ success: true })
}
