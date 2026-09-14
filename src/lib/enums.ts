// src/lib/enums.ts
export const Role = {
  ADMIN_ANALYST: 'ADMIN_ANALYST',
  PROCESS_MANAGER: 'PROCESS_MANAGER',
  PROCESS_OWNER: 'PROCESS_OWNER',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export type Role = typeof Role[keyof typeof Role];

export const ProcessStatus = {
  DRAFT: 'DRAFT',
  IN_REVIEW_ANALYST: 'IN_REVIEW_ANALYST',
  IN_REVIEW_OWNER: 'IN_REVIEW_OWNER',
  APPROVED: 'APPROVED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProcessStatus = typeof ProcessStatus[keyof typeof ProcessStatus];

export const WorkflowStage = {
  ANALYST_REVIEW: 'ANALYST_REVIEW',
  OWNER_REVIEW: 'OWNER_REVIEW',
  FINAL_APPROVAL: 'FINAL_APPROVAL',
} as const;

export type WorkflowStage = typeof WorkflowStage[keyof typeof WorkflowStage];

export const ProcessType = {
  MANAGERIAL: 'MANAGERIAL',
  MAIN: 'MAIN',
  SERVICE: 'SERVICE',
} as const;

export type ProcessType = typeof ProcessType[keyof typeof ProcessType];
