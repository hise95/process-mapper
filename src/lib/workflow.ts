// src/lib/workflow.ts
// Машина станів для процесу погодження AS-IS
import { ProcessStatus, WorkflowStage, Role } from './enums';
import { prisma } from './prisma'
import type { SessionUser } from './auth'

export type WorkflowTransition =
  | 'SUBMIT_FOR_ANALYST'
  | 'ANALYST_APPROVE'
  | 'ANALYST_REJECT'
  | 'OWNER_APPROVE'
  | 'OWNER_REJECT'
  | 'FINAL_APPROVE'

/** Наступний статус після переходу */
export const TRANSITION_MAP: Record<WorkflowTransition, ProcessStatus> = {
  SUBMIT_FOR_ANALYST: 'IN_REVIEW_ANALYST',
  ANALYST_APPROVE: 'IN_REVIEW_OWNER',
  ANALYST_REJECT: 'DRAFT',
  OWNER_APPROVE: 'IN_REVIEW_ANALYST', // повертається до аналітика для фінального затвердження
  OWNER_REJECT: 'DRAFT',
  FINAL_APPROVE: 'APPROVED',
}

/** Українські назви дій для History Log */
export const TRANSITION_LABEL: Record<WorkflowTransition, string> = {
  SUBMIT_FOR_ANALYST: 'ПОДАНО_НА_ПЕРЕВІРКУ_АНАЛІТИКУ',
  ANALYST_APPROVE: 'СХВАЛЕНО_АНАЛІТИКОМ',
  ANALYST_REJECT: 'ВІДХИЛЕНО_АНАЛІТИКОМ',
  OWNER_APPROVE: 'СХВАЛЕНО_ВЛАСНИКОМ',
  OWNER_REJECT: 'ВІДХИЛЕНО_ВЛАСНИКОМ',
  FINAL_APPROVE: 'ЗАТВЕРДЖЕНО',
}

/** Перевірка, чи може поточний користувач виконати перехід */
export function canTransition(
  user: SessionUser,
  currentStatus: ProcessStatus,
  transition: WorkflowTransition,
  ownerId: string | null
): boolean {
  switch (transition) {
    case 'SUBMIT_FOR_ANALYST':
      // Дозволяємо менеджеру або аналітику надсилати процес на будь-якому етапі до затвердження
      return (currentStatus === 'DRAFT' || currentStatus === 'IN_REVIEW_ANALYST' || currentStatus === 'IN_REVIEW_OWNER') &&
        (user.role === Role.ADMIN_ANALYST || user.role === Role.PROCESS_MANAGER)

    case 'ANALYST_APPROVE':
    case 'ANALYST_REJECT':
      return currentStatus === 'IN_REVIEW_ANALYST' && user.role === Role.ADMIN_ANALYST

    case 'OWNER_APPROVE':
    case 'OWNER_REJECT':
      return currentStatus === 'IN_REVIEW_OWNER' &&
        (user.role === Role.ADMIN_ANALYST ||
          (user.role === Role.PROCESS_OWNER && ownerId === user.id))

    case 'FINAL_APPROVE':
      // Аналітик може фінально затвердити процес як з IN_REVIEW_ANALYST, так і з IN_REVIEW_OWNER
      return (currentStatus === 'IN_REVIEW_ANALYST' || currentStatus === 'IN_REVIEW_OWNER') &&
        user.role === Role.ADMIN_ANALYST

    default:
      return false
  }
}

/**
 * Виконати перехід стану процесу.
 * Оновлює статус, ApprovalWorkflow та ProcessHistoryLog в одній транзакції.
 */
export async function applyTransition(
  processId: string,
  transition: WorkflowTransition,
  user: SessionUser,
  comment?: string
): Promise<void> {
  const newStatus = TRANSITION_MAP[transition]
  const action = TRANSITION_LABEL[transition]
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    // 1. Оновити статус процесу
    await tx.process.update({
      where: { id: processId },
      data: {
        status: newStatus,
        ...(transition === 'FINAL_APPROVE' ? { approvedAt: now } : {}),
      },
    })

    // 2. Якщо завершуємо etap — позначити workflow запис як виконаний
    if (transition === 'ANALYST_APPROVE' || transition === 'ANALYST_REJECT') {
      await tx.approvalWorkflow.updateMany({
        where: { processId, stage: WorkflowStage.ANALYST_REVIEW, isCompleted: false },
        data: { isCompleted: true, completedAt: now, comment },
      })
    }
    if (transition === 'OWNER_APPROVE' || transition === 'OWNER_REJECT') {
      await tx.approvalWorkflow.updateMany({
        where: { processId, stage: WorkflowStage.OWNER_REVIEW, isCompleted: false },
        data: { isCompleted: true, completedAt: now, comment },
      })
    }

    // 3. Створити новий workflow запис якщо потрібно
    if (transition === 'SUBMIT_FOR_ANALYST') {
      await tx.approvalWorkflow.create({
        data: {
          processId,
          stage: WorkflowStage.ANALYST_REVIEW,
          assignedToRole: Role.ADMIN_ANALYST,
        },
      })
    }
    if (transition === 'ANALYST_APPROVE') {
      await tx.approvalWorkflow.create({
        data: {
          processId,
          stage: WorkflowStage.OWNER_REVIEW,
          assignedToRole: Role.PROCESS_OWNER,
        },
      })
    }
    if (transition === 'OWNER_APPROVE') {
      await tx.approvalWorkflow.create({
        data: {
          processId,
          stage: WorkflowStage.FINAL_APPROVAL,
          assignedToRole: Role.ADMIN_ANALYST,
        },
      })
    }

    // 4. Якщо FINAL_APPROVE — архівуємо попередню версію (якщо є)
    if (transition === 'FINAL_APPROVE') {
      const process = await tx.process.findUnique({
        where: { id: processId },
        select: { previousVersionId: true },
      })
      if (process?.previousVersionId) {
        await tx.process.update({
          where: { id: process.previousVersionId },
          data: { status: 'ARCHIVED' },
        })
      }
    }

    // 5. Записати в журнал
    await tx.processHistoryLog.create({
      data: { processId, action, userId: user.id, comment, timestamp: now },
    })

    // 6. Створити сповіщення (Notification)
    const processData = await tx.process.findUnique({
      where: { id: processId },
      select: { title: true, ownerId: true, managerId: true },
    })

    if (processData) {
      if (transition === 'SUBMIT_FOR_ANALYST' || transition === 'OWNER_APPROVE') {
        // Повідомляємо всіх аналітиків
        const analysts = await tx.user.findMany({ where: { role: Role.ADMIN_ANALYST } })
        if (analysts.length > 0) {
          await tx.notification.createMany({
            data: analysts.map(a => ({
              userId: a.id,
              title: transition === 'SUBMIT_FOR_ANALYST' ? 'Новий процес на перевірку' : 'Власник погодив процес',
              message: `Процес "${processData.title}" очікує вашої дії.`,
              linkUrl: `/processes/${processId}`,
            }))
          })
        }
      } else if (transition === 'ANALYST_APPROVE') {
        if (processData.ownerId) {
          await tx.notification.create({
            data: {
              userId: processData.ownerId,
              title: 'Процес потребує вашого погодження',
              message: `Процес "${processData.title}" перевірено аналітиком.`,
              linkUrl: `/processes/${processId}`,
            }
          })
        }
      } else if (transition === 'ANALYST_REJECT' || transition === 'OWNER_REJECT' || transition === 'FINAL_APPROVE') {
        if (processData.managerId) {
          await tx.notification.create({
            data: {
              userId: processData.managerId,
              title: transition === 'FINAL_APPROVE' ? 'Процес затверджено' : 'Процес відхилено',
              message: `Процес "${processData.title}" ${transition === 'FINAL_APPROVE' ? 'було успішно затверджено' : 'було повернуто на доопрацювання'}.`,
              linkUrl: `/processes/${processId}`,
            }
          })
        }
      }
    }
  })
}

/**
 * Створити нову версію APPROVED процесу (починає редагування).
 * Стара версія залишається APPROVED до нового затвердження.
 */
export async function createNewVersion(
  processId: string,
  user: SessionUser
): Promise<string> {
  const original = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: { steps: true, kpis: true },
  })

  if (original.status !== 'APPROVED') {
    throw new Error('Нову версію можна створити тільки для APPROVED процесу')
  }

  const newProcess = await prisma.$transaction(async (tx) => {
    // Створити нову чернетку
    const created = await tx.process.create({
      data: {
        code: original.code,
        title: original.title,
        processType: original.processType,
        objective: original.objective,
        input: original.input,
        output: original.output,
        participants: original.participants,
        clients: original.clients,
        inputSupplier: original.inputSupplier,
        upstreamProcesses: original.upstreamProcesses,
        downstreamProcesses: original.downstreamProcesses,
        bpmnUrl: original.bpmnUrl,
        levelId: original.levelId,
        ownerId: original.ownerId,
        managerId: original.managerId,
        version: original.version + 1,
        status: 'DRAFT',
        previousVersionId: original.id,
      },
    })

    // Копіювати кроки
    await tx.processStep.createMany({
      data: original.steps.map(({ id: _id, processId: _pid, ...step }) => ({
        ...step,
        processId: created.id,
      })),
    })

    // Копіювати KPI
    await tx.processKPI.createMany({
      data: original.kpis.map(({ id: _id, processId: _pid, ...kpi }) => ({
        ...kpi,
        processId: created.id,
      })),
    })

    // Лог
    await tx.processHistoryLog.create({
      data: {
        processId: created.id,
        action: 'НОВА_ВЕРСІЯ',
        userId: user.id,
        comment: `Створено на основі версії ${original.version}`,
      },
    })

    return created
  })

  return newProcess.id
}
