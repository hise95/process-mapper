/**
 * src/lib/types.ts
 * Централізовані TypeScript-типи, похідні від Prisma-схеми.
 * Використовуйте замість `any` у всіх компонентах.
 */

import type {
  Process,
  ProcessStep,
  ProcessKPI,
  ProcessHistoryLog,
  ProcessLevel,
  ApprovalWorkflow,
  User,
} from '@prisma/client';

// ── Базові реекспорти для зручності ──────────────────────────────────────────
export type { Process, ProcessStep, ProcessKPI, ProcessHistoryLog, User };

// ── Тип сесії (з auth.ts) ─────────────────────────────────────────────────────
export type SessionUser = Pick<User, 'id' | 'email' | 'fullName' | 'role' | 'forcePasswordReset'>;

// ── Вкладені об'єкти відносин ─────────────────────────────────────────────────

/** Мінімальне подання менеджера / власника у вкладених запитах */
export type UserBrief = Pick<User, 'id' | 'fullName' | 'email'>;

/** Рівень процесу з батьківським рівнем */
export type LevelBrief = Pick<ProcessLevel, 'id' | 'name' | 'depth'> & {
  parent?: Pick<ProcessLevel, 'id' | 'name'> | null;
};

/** Лог дій — з ім'ям виконавця */
export type HistoryLogWithUser = ProcessHistoryLog & {
  user: Pick<User, 'id' | 'fullName'>;
};

// ── Процес із відносинами (стандартна форма для сторінок) ─────────────────────

/** Процес для списку (легке навантаження) */
export type ProcessListItem = Process & {
  manager: UserBrief | null;
  owner: UserBrief | null;
  level: LevelBrief | null;
};

/** Процес для перегляду (повне навантаження) */
export type ProcessFull = Process & {
  steps: ProcessStep[];
  kpis: ProcessKPI[];
  historyLogs: HistoryLogWithUser[];
  workflow: ApprovalWorkflow[];
  manager: UserBrief | null;
  owner: UserBrief | null;
  level: LevelBrief | null;
};

/** Процес для редагування — без повного historyLogs, але з мінімальним для перевірки стану */
export type ProcessForEdit = Process & {
  steps: ProcessStep[];
  kpis: ProcessKPI[];
  historyLogs: Pick<ProcessHistoryLog, 'action' | 'timestamp'>[];
  manager: UserBrief | null;
  owner: UserBrief | null;
  level: LevelBrief | null;
};

/** Процес для Kanban (мінімальне відображення) */
export type ProcessKanbanItem = Pick<
  Process,
  'id' | 'title' | 'code' | 'status' | 'processType' | 'updatedAt'
> & {
  manager: Pick<User, 'fullName'> | null;
  owner: Pick<User, 'fullName'> | null;
};

// ── Відповіді API ─────────────────────────────────────────────────────────────

/** Помилка від API */
export interface ApiError {
  error: string;
}

// ── Типи для WorkflowChecklist ────────────────────────────────────────────────

/** Процес у компоненті Checklist — потребує historyLogs для перевірки стану */
export type ProcessForChecklist = Pick<
  Process,
  'id' | 'title' | 'status' | 'ownerId' | 'managerId'
> & {
  historyLogs: (Pick<ProcessHistoryLog, 'action' | 'timestamp' | 'comment'> & { user?: { fullName: string } | null })[];
};

// ── Типи для ApprovalSplitScreen ─────────────────────────────────────────────

/** Процес у лівій панелі та картці черги погоджень */
export type ProcessApprovalCard = Process & {
  manager: Pick<User, 'fullName'> | null;
  owner: Pick<User, 'fullName'> | null;
  steps?: ProcessStep[];
  kpis?: ProcessKPI[];
  historyLogs: (Pick<ProcessHistoryLog, 'action' | 'timestamp' | 'comment'> & { user?: { fullName: string } | null })[];
};
