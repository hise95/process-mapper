// src/lib/enums.ts
export const Role = {
  ADMIN: 'ADMIN',
  PROCESS_ANALYST: 'PROCESS_ANALYST',
  PROCESS_MANAGER: 'PROCESS_MANAGER',
  PROCESS_OWNER: 'PROCESS_OWNER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type Role = typeof Role[keyof typeof Role];

export const ROLES_UA: Record<string, string> = {
  ADMIN: 'Адміністратор',
  PROCESS_ANALYST: 'Процесний аналітик',
  PROCESS_MANAGER: 'Менеджер процесу',
  PROCESS_OWNER: 'Власник процесу',
  EMPLOYEE: 'Працівник',
};

// 3-фазна модель: Паспорт -> Кроки -> Показники -> Фінал
export const ProcessStatus = {
  // Фаза 1: Паспорт
  DRAFT: 'DRAFT', // PASSPORT_DRAFT
  PASSPORT_REVIEW_ANALYST: 'PASSPORT_REVIEW_ANALYST',
  PASSPORT_REVIEW_OWNER: 'PASSPORT_REVIEW_OWNER',
  
  // Фаза 2: Кроки та BPMN
  STEPS_DRAFT: 'STEPS_DRAFT',
  STEPS_REVIEW_ANALYST: 'STEPS_REVIEW_ANALYST',
  STEPS_REVIEW_OWNER: 'STEPS_REVIEW_OWNER',
  
  // Фаза 3: Показники
  KPIS_DRAFT: 'KPIS_DRAFT',
  KPIS_REVIEW_ANALYST: 'KPIS_REVIEW_ANALYST',
  KPIS_REVIEW_OWNER: 'KPIS_REVIEW_OWNER',
  
  // Фінал
  FINAL_APPROVAL_ANALYST: 'FINAL_APPROVAL_ANALYST',
  
  // Завершальні
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProcessStatus = typeof ProcessStatus[keyof typeof ProcessStatus];

export const PROCESS_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; color: string; className: string }> = {
  DRAFT: { label: 'Чернетка (Паспорт)', variant: 'secondary', color: 'bg-slate-100 text-slate-700', className: 'bg-slate-500 text-white' },
  PASSPORT_REVIEW_ANALYST: { label: 'Паспорт: Перевірка А.', variant: 'outline', color: 'bg-amber-100 text-amber-800 border-amber-300', className: 'bg-amber-500 text-white' },
  PASSPORT_REVIEW_OWNER: { label: 'Паспорт: Погодження В.', variant: 'outline', color: 'bg-orange-100 text-orange-800 border-orange-300', className: 'bg-orange-500 text-white' },
  
  STEPS_DRAFT: { label: 'Чернетка (Кроки)', variant: 'secondary', color: 'bg-slate-100 text-slate-700', className: 'bg-slate-500 text-white' },
  STEPS_REVIEW_ANALYST: { label: 'Кроки: Перевірка А.', variant: 'outline', color: 'bg-amber-100 text-amber-800 border-amber-300', className: 'bg-amber-500 text-white' },
  STEPS_REVIEW_OWNER: { label: 'Кроки: Погодження В.', variant: 'outline', color: 'bg-orange-100 text-orange-800 border-orange-300', className: 'bg-orange-500 text-white' },
  
  KPIS_DRAFT: { label: 'Чернетка (Показники)', variant: 'secondary', color: 'bg-slate-100 text-slate-700', className: 'bg-slate-500 text-white' },
  KPIS_REVIEW_ANALYST: { label: 'Показники: Перевірка А.', variant: 'outline', color: 'bg-amber-100 text-amber-800 border-amber-300', className: 'bg-amber-500 text-white' },
  KPIS_REVIEW_OWNER: { label: 'Показники: Погодження В.', variant: 'outline', color: 'bg-orange-100 text-orange-800 border-orange-300', className: 'bg-orange-500 text-white' },
  
  FINAL_APPROVAL_ANALYST: { label: 'Фінальне затвердження', variant: 'outline', color: 'bg-blue-100 text-blue-800 border-blue-300', className: 'bg-blue-600 text-white' },
  APPROVED: { label: 'Затверджено', variant: 'default', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', className: 'bg-emerald-600 text-white' },
  ARCHIVED: { label: 'В архіві', variant: 'secondary', color: 'bg-slate-100 text-slate-500', className: 'bg-slate-400 text-white' },

  IN_REVIEW_ANALYST: { label: 'На перевірці аналітика', variant: 'outline', color: 'bg-amber-100 text-amber-800', className: 'bg-amber-500 text-white' },
  IN_REVIEW_OWNER: { label: 'На погодженні власника', variant: 'outline', color: 'bg-orange-100 text-orange-800', className: 'bg-orange-500 text-white' },
};

export function getStatusLabel(status: string): string {
  return PROCESS_STATUS_LABELS[status]?.label || status;
}

export const WorkflowStage = {
  PASSPORT_ANALYST_REVIEW: 'PASSPORT_ANALYST_REVIEW',
  PASSPORT_OWNER_REVIEW: 'PASSPORT_OWNER_REVIEW',
  
  STEPS_ANALYST_REVIEW: 'STEPS_ANALYST_REVIEW',
  STEPS_OWNER_REVIEW: 'STEPS_OWNER_REVIEW',
  
  KPIS_ANALYST_REVIEW: 'KPIS_ANALYST_REVIEW',
  KPIS_OWNER_REVIEW: 'KPIS_OWNER_REVIEW',
  
  FINAL_APPROVAL: 'FINAL_APPROVAL',
} as const;

export type WorkflowStage = typeof WorkflowStage[keyof typeof WorkflowStage];

export const ProcessType = {
  MANAGERIAL: 'MANAGERIAL',
  MAIN: 'MAIN',
  SERVICE: 'SERVICE',
} as const;

export type ProcessType = typeof ProcessType[keyof typeof ProcessType];

export const PROCESS_TYPE_LABELS: Record<string, string> = {
  MANAGERIAL: 'Управлінський',
  MAIN: 'Основний',
  SERVICE: 'Сервісний',
  'Управлінський': 'Управлінський',
  'Основний': 'Основний',
  'Сервісний': 'Сервісний',
  'ОСНОВНИЙ': 'Основний',
  'УПРАВЛІНСЬКИЙ': 'Управлінський',
  'СЕРВІСНИЙ': 'Сервісний',
};
