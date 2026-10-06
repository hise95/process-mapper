// src/lib/workflow.ts
// Логіка життєвого циклу процесів (3 фази: Паспорт -> Кроки -> Показники)
import { ProcessStatus, WorkflowStage, Role } from './enums';
import { prisma } from './prisma'
import type { SessionUser } from './auth'

export type WorkflowTransition =
  | 'SUBMIT_PASSPORT_ANALYST'
  | 'APPROVE_PASSPORT_ANALYST'
  | 'REJECT_PASSPORT_ANALYST'
  | 'APPROVE_PASSPORT_OWNER'
  | 'REJECT_PASSPORT_OWNER'
  
  | 'SUBMIT_STEPS_ANALYST'
  | 'APPROVE_STEPS_ANALYST'
  | 'REJECT_STEPS_ANALYST'
  | 'APPROVE_STEPS_OWNER'
  | 'REJECT_STEPS_OWNER'
  
  | 'SUBMIT_KPIS_ANALYST'
  | 'APPROVE_KPIS_ANALYST'
  | 'REJECT_KPIS_ANALYST'
  | 'APPROVE_KPIS_OWNER'
  | 'REJECT_KPIS_OWNER'
  
  | 'FINAL_APPROVE'
  | 'FINAL_REJECT'

export const TRANSITION_MAP: Record<WorkflowTransition, ProcessStatus> = {
  // Фаза 1
  SUBMIT_PASSPORT_ANALYST: 'PASSPORT_REVIEW_ANALYST',
  APPROVE_PASSPORT_ANALYST: 'PASSPORT_REVIEW_OWNER',
  REJECT_PASSPORT_ANALYST: 'DRAFT',
  APPROVE_PASSPORT_OWNER: 'STEPS_DRAFT',
  REJECT_PASSPORT_OWNER: 'DRAFT',
  
  // Фаза 2
  SUBMIT_STEPS_ANALYST: 'STEPS_REVIEW_ANALYST',
  APPROVE_STEPS_ANALYST: 'STEPS_REVIEW_OWNER',
  REJECT_STEPS_ANALYST: 'STEPS_DRAFT',
  APPROVE_STEPS_OWNER: 'KPIS_DRAFT',
  REJECT_STEPS_OWNER: 'STEPS_DRAFT',
  
  // Фаза 3
  SUBMIT_KPIS_ANALYST: 'KPIS_REVIEW_ANALYST',
  APPROVE_KPIS_ANALYST: 'KPIS_REVIEW_OWNER',
  REJECT_KPIS_ANALYST: 'KPIS_DRAFT',
  APPROVE_KPIS_OWNER: 'FINAL_APPROVAL_ANALYST',
  REJECT_KPIS_OWNER: 'KPIS_DRAFT',
  
  // Фінал
  FINAL_APPROVE: 'APPROVED',
  FINAL_REJECT: 'KPIS_DRAFT', // Або можна повернути на будь-який драфт, але зазвичай на останній етап
}

export const TRANSITION_LABEL: Record<WorkflowTransition, string> = {
  SUBMIT_PASSPORT_ANALYST: 'ПОДАНО_ПАСПОРТ_АНАЛІТИКУ',
  APPROVE_PASSPORT_ANALYST: 'ПАСПОРТ_СХВАЛЕНО_АНАЛІТИКОМ',
  REJECT_PASSPORT_ANALYST: 'ПАСПОРТ_ВІДХИЛЕНО_АНАЛІТИКОМ',
  APPROVE_PASSPORT_OWNER: 'ПАСПОРТ_СХВАЛЕНО_ВЛАСНИКОМ',
  REJECT_PASSPORT_OWNER: 'ПАСПОРТ_ВІДХИЛЕНО_ВЛАСНИКОМ',
  
  SUBMIT_STEPS_ANALYST: 'ПОДАНО_КРОКИ_АНАЛІТИКУ',
  APPROVE_STEPS_ANALYST: 'КРОКИ_СХВАЛЕНО_АНАЛІТИКОМ',
  REJECT_STEPS_ANALYST: 'КРОКИ_ВІДХИЛЕНО_АНАЛІТИКОМ',
  APPROVE_STEPS_OWNER: 'КРОКИ_СХВАЛЕНО_ВЛАСНИКОМ',
  REJECT_STEPS_OWNER: 'КРОКИ_ВІДХИЛЕНО_ВЛАСНИКОМ',

  SUBMIT_KPIS_ANALYST: 'ПОДАНО_ПОКАЗНИКИ_АНАЛІТИКУ',
  APPROVE_KPIS_ANALYST: 'ПОКАЗНИКИ_СХВАЛЕНО_АНАЛІТИКОМ',
  REJECT_KPIS_ANALYST: 'ПОКАЗНИКИ_ВІДХИЛЕНО_АНАЛІТИКОМ',
  APPROVE_KPIS_OWNER: 'ПОКАЗНИКИ_СХВАЛЕНО_ВЛАСНИКОМ',
  REJECT_KPIS_OWNER: 'ПОКАЗНИКИ_ВІДХИЛЕНО_ВЛАСНИКОМ',

  FINAL_APPROVE: 'ФІНАЛЬНО_ЗАТВЕРДЖЕНО',
  FINAL_REJECT: 'ФІНАЛЬНО_ВІДХИЛЕНО',
}

export function canExecuteTransition(
  transition: WorkflowTransition,
  currentStatus: ProcessStatus,
  user: SessionUser,
  process: { ownerId: string | null; managerId: string | null }
): boolean {
  const isAnalyst = user.role === Role.PROCESS_ANALYST || user.role === Role.ADMIN;
  const isOwner = isAnalyst || process.ownerId === user.id;
  const isManager = isAnalyst || process.managerId === user.id;

  switch (transition) {
    case 'SUBMIT_PASSPORT_ANALYST':
      return currentStatus === 'DRAFT' && (isManager || isOwner)
    case 'APPROVE_PASSPORT_ANALYST':
    case 'REJECT_PASSPORT_ANALYST':
      return currentStatus === 'PASSPORT_REVIEW_ANALYST' && isAnalyst
    case 'APPROVE_PASSPORT_OWNER':
    case 'REJECT_PASSPORT_OWNER':
      return currentStatus === 'PASSPORT_REVIEW_OWNER' && isOwner

    case 'SUBMIT_STEPS_ANALYST':
      return currentStatus === 'STEPS_DRAFT' && (isManager || isOwner)
    case 'APPROVE_STEPS_ANALYST':
    case 'REJECT_STEPS_ANALYST':
      return currentStatus === 'STEPS_REVIEW_ANALYST' && isAnalyst
    case 'APPROVE_STEPS_OWNER':
    case 'REJECT_STEPS_OWNER':
      return currentStatus === 'STEPS_REVIEW_OWNER' && isOwner

    case 'SUBMIT_KPIS_ANALYST':
      return currentStatus === 'KPIS_DRAFT' && (isManager || isOwner)
    case 'APPROVE_KPIS_ANALYST':
    case 'REJECT_KPIS_ANALYST':
      return currentStatus === 'KPIS_REVIEW_ANALYST' && isAnalyst
    case 'APPROVE_KPIS_OWNER':
    case 'REJECT_KPIS_OWNER':
      return currentStatus === 'KPIS_REVIEW_OWNER' && isOwner

    case 'FINAL_APPROVE':
    case 'FINAL_REJECT':
      return currentStatus === 'FINAL_APPROVAL_ANALYST' && isAnalyst

    default:
      return false
  }
}

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
    // 1. Оновлення статусу
    await tx.process.update({
      where: { id: processId },
      data: {
        status: newStatus,
        ...(transition === 'FINAL_APPROVE' ? { approvedAt: now } : {}),
      },
    })

    // 2. Закриваємо активні workflow кроки
    if (transition.includes('REJECT') || transition.includes('APPROVE')) {
      await tx.approvalWorkflow.updateMany({
        where: { processId, isCompleted: false },
        data: { isCompleted: true, completedAt: now, comment },
      })
    }

    // 3. Створюємо нові workflow кроки (хто має діяти наступним)
    if (transition === 'SUBMIT_PASSPORT_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.PASSPORT_ANALYST_REVIEW, assignedToRole: Role.PROCESS_ANALYST } })
    }
    if (transition === 'APPROVE_PASSPORT_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.PASSPORT_OWNER_REVIEW, assignedToRole: Role.PROCESS_OWNER } })
    }
    if (transition === 'SUBMIT_STEPS_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.STEPS_ANALYST_REVIEW, assignedToRole: Role.PROCESS_ANALYST } })
    }
    if (transition === 'APPROVE_STEPS_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.STEPS_OWNER_REVIEW, assignedToRole: Role.PROCESS_OWNER } })
    }
    if (transition === 'SUBMIT_KPIS_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.KPIS_ANALYST_REVIEW, assignedToRole: Role.PROCESS_ANALYST } })
    }
    if (transition === 'APPROVE_KPIS_ANALYST') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.KPIS_OWNER_REVIEW, assignedToRole: Role.PROCESS_OWNER } })
    }
    if (transition === 'APPROVE_KPIS_OWNER') {
      await tx.approvalWorkflow.create({ data: { processId, stage: WorkflowStage.FINAL_APPROVAL, assignedToRole: Role.PROCESS_ANALYST } })
    }

    // 4. Архівування попередньої версії при фінальному затвердженні
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

    // 5. Лог історії
    await tx.processHistoryLog.create({
      data: { processId, action, userId: user.id, comment, timestamp: now },
    })

    // 6. Сповіщення
    const processData = await tx.process.findUnique({
      where: { id: processId },
      select: { title: true, ownerId: true, managerId: true },
    })

    if (processData) {
      if (transition.includes('SUBMIT_') || transition === 'APPROVE_KPIS_OWNER') {
        const analysts = await tx.user.findMany({ where: { role: { in: [Role.PROCESS_ANALYST, Role.ADMIN] } } })
        if (analysts.length > 0) {
          await tx.notification.createMany({
            data: analysts.map(a => ({
              userId: a.id,
              title: 'Новий запит на перевірку',
              message: `Процес "${processData.title}" очікує вашої перевірки.`,
              linkUrl: `/processes/${processId}`,
            }))
          })
        }
      } else if (transition.includes('APPROVE_') && transition.includes('_ANALYST')) {
        if (processData.ownerId) {
          await tx.notification.create({
            data: {
              userId: processData.ownerId,
              title: 'Погодження процесу',
              message: `Процес "${processData.title}" очікує вашого погодження.`,
              linkUrl: `/processes/${processId}`,
            }
          })
        }
      } else if (
        transition.includes('REJECT_') ||
        transition === 'FINAL_REJECT' ||
        transition === 'FINAL_APPROVE' ||
        transition.includes('APPROVE_PASSPORT_OWNER') ||
        transition.includes('APPROVE_STEPS_OWNER') ||
        transition.includes('APPROVE_KPIS_OWNER')
      ) {
        if (processData.managerId) {
          await tx.notification.create({
            data: {
              userId: processData.managerId,
              title: transition === 'FINAL_APPROVE' ? 'Процес затверджено' : (transition.includes('REJECT') ? 'Процес відхилено' : 'Процес повернуто для наступного етапу'),
              message: `Статус процесу "${processData.title}" змінився.`,
              linkUrl: `/processes/${processId}`,
            }
          })
        }
      }
    }
  })
}

export async function createNewVersion(
  processId: string,
  user: SessionUser
): Promise<string> {
  const original = await prisma.process.findUniqueOrThrow({
    where: { id: processId },
    include: { steps: true, kpis: true },
  })

  if (original.status !== 'APPROVED') {
    throw new Error('Тільки затверджений процес може мати нову версію')
  }

  const newProcess = await prisma.$transaction(async (tx) => {
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

    await tx.processStep.createMany({
      data: original.steps.map(({ id: _id, processId: _pid, ...step }) => ({
        ...step,
        processId: created.id,
      })),
    })

    await tx.processKPI.createMany({
      data: original.kpis.map(({ id: _id, processId: _pid, ...kpi }) => ({
        ...kpi,
        processId: created.id,
      })),
    })

    await tx.processHistoryLog.create({
      data: {
        processId: created.id,
        action: 'НОВА_ВЕРСІЯ',
        userId: user.id,
        comment: `Створено на базі версії ${original.version}`,
      },
    })

    return created
  })

  return newProcess.id
}
