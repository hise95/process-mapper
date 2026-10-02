// src/app/api/processes/[id]/route.ts
// GET — отримати процес по ID
// PATCH — оновити процес
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canEditProcess, canEditPassport, canEditSteps } from '@/lib/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { id } = await params

  try {
    const process = await prisma.process.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        manager: { select: { id: true, fullName: true, email: true } },
        level: { select: { id: true, name: true, depth: true, parent: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } } } },
        steps: { orderBy: { orderIndex: 'asc' } },
        kpis: true,
        workflow: { orderBy: { createdAt: 'asc' } },
        historyLogs: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { timestamp: 'desc' },
        },
        previousVersion: { select: { id: true, version: true, status: true } },
        nextVersion: { select: { id: true, version: true, status: true } },
      },
    })

    if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

    return NextResponse.json(process)
  } catch (error) {
    console.error('Error fetching process details:', error)
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession().catch(() => null)
    if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

    const { id } = await params
    const process = await prisma.process.findUnique({ where: { id } })
    if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

    if (!canEditProcess(session, process)) {
      return NextResponse.json({ error: 'Редагування недоступне' }, { status: 403 })
    }

    const body = await req.json()

    const passportFields = [
      'title', 'processType', 'code', 'objective', 'input', 'output',
      'participants', 'clients', 'inputSupplier', 'upstreamProcesses',
      'downstreamProcesses', 'levelId', 'ownerId', 'managerId',
    ]
    const stepsFields = ['bpmnUrl']

    const canPass = canEditPassport(session, process);
    const canStp = canEditSteps(session, process);

    const data: Record<string, unknown> = {}
    
    // Перевіряємо чи є спроба оновити поля з забороненої фази
    let forbiddenEdit = false;

    for (const field of passportFields) {
      if (field in body) {
        if (!canPass) forbiddenEdit = true;
        else data[field] = body[field];
      }
    }
    for (const field of stepsFields) {
      if (field in body) {
        if (!canStp) forbiddenEdit = true;
        else data[field] = body[field];
      }
    }

    if (forbiddenEdit && Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Редагування цих даних недоступне на поточній фазі' }, { status: 403 })
    }

    // Перевірити рівень якщо змінюється
    if (data.levelId) {
      const level = await prisma.processLevel.findUnique({ where: { id: data.levelId as string } })
      if (level && level.depth < 1) {
        return NextResponse.json({ error: 'Процес можна прив\'язати тільки до рівня L2 або L3' }, { status: 400 })
      }
    }

    const updated = await prisma.process.update({ where: { id }, data })

    await prisma.processHistoryLog.create({
      data: { processId: id, action: 'ОНОВЛЕНО', userId: session.id },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating process:', error)
    return NextResponse.json({ error: 'Помилка сервера при оновленні' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession().catch(() => null)
    if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

    const { id } = await params
    const process = await prisma.process.findUnique({ where: { id } })
    
    if (!process) return NextResponse.json({ error: 'Процес не знайдено' }, { status: 404 })

    const isAdmin = session.role === 'ADMIN'
    const isDraft = ['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT'].includes(process.status)

    if (!isDraft && !isAdmin) {
      return NextResponse.json({ error: 'Видалити можна тільки чернетки' }, { status: 400 })
    }

    const isAnalystOrAdmin = ['PROCESS_ANALYST', 'ADMIN'].includes(session.role)
    if (process.managerId !== session.id && !isAnalystOrAdmin) {
      return NextResponse.json({ error: 'Немає прав на видалення цього процесу' }, { status: 403 })
    }

    await prisma.process.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting process:', error)
    return NextResponse.json({ error: 'Помилка сервера при видаленні' }, { status: 500 })
  }
}
