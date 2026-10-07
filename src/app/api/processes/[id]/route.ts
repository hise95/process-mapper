// src/app/api/processes/[id]/route.ts
// GET — отримати процес по ID
// PATCH — оновити процес
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { isValidHttpUrl } from '@/lib/validation'
import { processPatchSchema } from '@/lib/schemas';
import { canEditProcess, canEditPassport, canEditSteps, canViewProcess, canAssignProcessManager, canAssignProcessOwner, isAdmin, isOwner } from '@/lib/permissions'

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

    if (!canViewProcess(session, process)) {
      return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
    }

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

    if (!canViewProcess(session, process)) {
      return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
    }

    if (!canEditProcess(session, process)) {
      return NextResponse.json({ error: 'Редагування недоступне' }, { status: 403 })
    }

    const rawBody = await req.json()
    const parseResult = processPatchSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 })
    }
    const body: Record<string, any> = parseResult.data

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

    // CWE-20/601: Validate bpmnUrl
    if ('bpmnUrl' in data && !isValidHttpUrl(data.bpmnUrl as string)) {
      return NextResponse.json({ error: 'bpmnUrl має бути валідним HTTP/HTTPS посиланням' }, { status: 400 })
    }

    // CWE-915 / CWE-862: Validate Ownership Changes (Mass Assignment)
    if ('ownerId' in data && data.ownerId !== process.ownerId) {
      if (!canAssignProcessOwner(session)) {
        return NextResponse.json({ error: 'Тільки аналітик або адміністратор може змінювати власника процесу' }, { status: 403 })
      }
      if (data.ownerId !== null) {
        const ownerUser = await prisma.user.findUnique({ where: { id: data.ownerId as string } });
        if (!ownerUser || (ownerUser.role !== 'PROCESS_OWNER' && ownerUser.role !== 'ADMIN' && ownerUser.role !== 'PROCESS_ANALYST')) {
          return NextResponse.json({ error: 'Користувач для ownerId не має ролі Власника' }, { status: 400 });
        }
      }
    }

    if ('managerId' in data && data.managerId !== process.managerId) {
      if (!canAssignProcessManager(session)) {
        return NextResponse.json({ error: 'Тільки власник або аналітик може призначати менеджера' }, { status: 403 })
      }
      if (isOwner(session.role) && process.ownerId !== session.id) {
        return NextResponse.json({ error: 'Ви можете призначати менеджера тільки для своїх процесів' }, { status: 403 })
      }
      if (data.managerId !== null) {
        const managerUser = await prisma.user.findUnique({ where: { id: data.managerId as string } });
        if (!managerUser || (managerUser.role !== 'PROCESS_MANAGER' && managerUser.role !== 'PROCESS_OWNER' && managerUser.role !== 'ADMIN' && managerUser.role !== 'PROCESS_ANALYST')) {
          return NextResponse.json({ error: 'Користувач для managerId не має відповідної ролі' }, { status: 400 });
        }
      }
    }

    // Перевірити рівень якщо змінюється
    if (data.levelId) {
      const level = await prisma.processLevel.findUnique({ where: { id: data.levelId as string } })
      if (level && level.depth < 1) {
        return NextResponse.json({ error: 'Процес можна прив\'язати тільки до рівня L2 або L3' }, { status: 400 })
      }
    }

    // CWE-362: OCC - Оновлюємо тільки якщо статус не змінився з моменту findUnique
    const updateResult = await prisma.process.updateMany({ 
      where: { id, status: process.status }, 
      data 
    });
    
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Конфлікт паралельних запитів: статус або стан процесу був змінений' }, { status: 409 });
    }
    
    const updated = { ...process, ...data }; // Повертаємо очікуваний об'єкт

    if (!['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT'].includes(process.status)) {
      await prisma.processHistoryLog.create({
        data: { processId: id, action: 'ОНОВЛЕНО', userId: session.id },
      })
    }

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

    if (!canViewProcess(session, process)) {
      return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
    }

    const isUserAdmin = isAdmin(session.role)
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
