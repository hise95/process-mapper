// src/app/api/processes/route.ts
// GET — список процесів (з фільтрацією по ролі)
// POST — створити новий процес
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { canCreateProcess, isAnalystOrAdmin, isManager, isOwner, isEmployee, canAssignProcessOwner, canAssignProcessManager } from '@/lib/permissions'
import { Role } from '../../../lib/enums';

export async function GET(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const levelId = searchParams.get('levelId')

  const pending = searchParams.get('pending')

  // Побудова фільтра за роллю
  const where: any = {}

  // 1. Жорсткі обмеження видимості за роллю (Base Object Level Authorization)
  if (!isAnalystOrAdmin(session.role)) {
    if (isManager(session.role)) {
      where.managerId = session.id
    } else if (isOwner(session.role)) {
      where.ownerId = session.id
    } else if (isEmployee(session.role)) {
      where.status = 'APPROVED'
    } else {
      return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
    }
  }

  // 2. Додаткові фільтри (status / pending)
  if (pending === 'true') {
    if (isAnalystOrAdmin(session.role)) {
      where.status = { in: [
        'PASSPORT_REVIEW_ANALYST', 'STEPS_REVIEW_ANALYST', 'KPIS_REVIEW_ANALYST', 'FINAL_APPROVAL_ANALYST',
        'PASSPORT_REVIEW_OWNER', 'STEPS_REVIEW_OWNER', 'KPIS_REVIEW_OWNER'
      ] }
    } else if (isOwner(session.role)) {
      where.status = { in: ['PASSPORT_REVIEW_OWNER', 'STEPS_REVIEW_OWNER', 'KPIS_REVIEW_OWNER'] }
    } else {
      // Інші ролі не мають pending-процесів
      where.id = 'NO_ACCESS_PENDING'
    }
  } else if (status) {
    if (status === 'ARCHIVED' && !isAnalystOrAdmin(session.role)) {
      return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
    }
    if (isEmployee(session.role) && status !== 'APPROVED') {
      where.id = 'NO_ACCESS_STATUS'
    } else {
      where.status = status
    }
  } else {
    if (!isEmployee(session.role)) {
      where.status = { not: 'ARCHIVED' }
    }
  }

  if (levelId) where.levelId = levelId

  try {
    const processes = await prisma.process.findMany({
      where,
      include: {
        owner: { select: { id: true, fullName: true } },
        manager: { select: { id: true, fullName: true } },
        level: { select: { id: true, name: true, depth: true } },
        steps: { orderBy: { orderIndex: 'asc' } },
        kpis: true,
        _count: { select: { steps: true, kpis: true } },
        historyLogs: {
          orderBy: { timestamp: 'desc' },
          include: { user: { select: { fullName: true } } }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(processes)
  } catch (error) {
    console.error('Error fetching processes:', error)
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canCreateProcess(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })

  const body = await req.json()
  const { title, processType, levelId, ownerId, managerId } = body

  if (!title) return NextResponse.json({ error: 'Назва процесу обов\'язкова' }, { status: 400 })

  try {
    // Перевірити що рівень L2 або L3
    if (levelId) {
      const level = await prisma.processLevel.findUnique({ where: { id: levelId } })
      if (level && level.depth < 1) {
        return NextResponse.json({ error: 'Процес можна прив\'язати тільки до рівня L2 або L3' }, { status: 400 })
      }
    }

    let finalOwnerId = ownerId || null;
    let finalManagerId = managerId || session.id;

    // CWE-915 / CWE-862: Mass assignment & ownership validation
    if (ownerId && !canAssignProcessOwner(session)) {
      if (isOwner(session.role)) {
        finalOwnerId = session.id; // Owner can only assign themselves
      } else {
        return NextResponse.json({ error: 'Тільки аналітик або власник може призначати ownerId' }, { status: 403 })
      }
    }

    if (managerId && managerId !== session.id && !canAssignProcessManager(session)) {
      return NextResponse.json({ error: 'Ви не маєте права призначати іншого менеджера' }, { status: 403 })
    }

    if (finalOwnerId) {
      const ownerUser = await prisma.user.findUnique({ where: { id: finalOwnerId } });
      if (!ownerUser || (ownerUser.role !== 'PROCESS_OWNER' && ownerUser.role !== 'ADMIN' && ownerUser.role !== 'PROCESS_ANALYST')) {
        return NextResponse.json({ error: 'Користувач для ownerId не має ролі Власника' }, { status: 400 });
      }
    }

    if (finalManagerId) {
      const managerUser = await prisma.user.findUnique({ where: { id: finalManagerId } });
      if (!managerUser || (managerUser.role !== 'PROCESS_MANAGER' && managerUser.role !== 'PROCESS_OWNER' && managerUser.role !== 'ADMIN' && managerUser.role !== 'PROCESS_ANALYST')) {
        return NextResponse.json({ error: 'Користувач для managerId не має відповідної ролі' }, { status: 400 });
      }
    }

    const process = await prisma.process.create({
      data: {
        title,
        processType: processType ?? 'MAIN',
        levelId: levelId || null,
        ownerId: finalOwnerId,
        managerId: finalManagerId,
        status: 'DRAFT',
        version: 1,
      },
    })

    // Записати в журнал
    await prisma.processHistoryLog.create({
      data: { processId: process.id, action: 'СТВОРЕНО', userId: session.id },
    })

    return NextResponse.json(process, { status: 201 })
  } catch (error) {
    console.error('Error creating process:', error)
    return NextResponse.json({ error: 'Помилка сервера' }, { status: 500 })
  }
}
