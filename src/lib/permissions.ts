// src/lib/permissions.ts
// RBAC — перевірки доступу для всіх ролей
import type { SessionUser } from './auth'
import type { Process } from '@prisma/client'
import { Role } from './enums';

// ── Ролі ──
export const ROLES_UA: Record<string, string> = {
  ADMIN: 'Адміністратор',
  PROCESS_ANALYST: 'Процесний аналітик',
  PROCESS_MANAGER: 'Менеджер процесу',
  PROCESS_OWNER: 'Власник процесу',
  EMPLOYEE: 'Працівник',
}

// ── Допоміжна перевірка аналітика ──
export const isAnalystOrAdmin = (role: string) =>
  role === Role.PROCESS_ANALYST || role === Role.ADMIN

export const isAnalystRole = isAnalystOrAdmin;

// ── Перевірки ──

export function canCreateProcess(user: SessionUser): boolean {
  return isAnalystOrAdmin(user.role) || user.role === Role.PROCESS_MANAGER || user.role === Role.PROCESS_OWNER
}

export function canEditProcess(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (process.status === 'APPROVED' || process.status === 'ARCHIVED') return false
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_MANAGER) {
    return !process.managerId || process.managerId === user.id
  }
  if (user.role === Role.PROCESS_OWNER) {
    return !process.ownerId || process.ownerId === user.id
  }
  return false
}

export function canSubmitForReview(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  const draftStatuses = ['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT']
  if (!draftStatuses.includes(process.status)) return false
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_MANAGER && process.managerId === user.id) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}

export function canApproveAsAnalyst(user: SessionUser): boolean {
  return isAnalystOrAdmin(user.role)
}

export function canApproveAsOwner(user: SessionUser, process: Pick<Process, 'ownerId'>): boolean {
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}

export function canViewAdminPanel(user: SessionUser): boolean {
  return user.role === Role.ADMIN
}

export function canViewRepository(_user: SessionUser): boolean {
  return true // Усі ролі мають доступ до репозиторію
}

/** Чи може користувач створити нову версію APPROVED процесу */
export function canCreateNewVersion(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (process.status !== 'APPROVED') return false
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_MANAGER && process.managerId === user.id) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}

const PHASE_1_STATUSES = ['DRAFT', 'PASSPORT_REVIEW_ANALYST', 'PASSPORT_REVIEW_OWNER'];
const PHASE_2_STATUSES = ['STEPS_DRAFT', 'STEPS_REVIEW_ANALYST', 'STEPS_REVIEW_OWNER'];
const PHASE_3_STATUSES = ['KPIS_DRAFT', 'KPIS_REVIEW_ANALYST', 'KPIS_REVIEW_OWNER', 'FINAL_APPROVAL_ANALYST'];

export function canEditPassport(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (!canEditProcess(user, process)) return false;
  if (isAnalystOrAdmin(user.role)) return true;
  return PHASE_1_STATUSES.includes(process.status);
}

export function canEditSteps(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (!canEditProcess(user, process)) return false;
  if (isAnalystOrAdmin(user.role)) return true;
  return PHASE_2_STATUSES.includes(process.status);
}

export function canEditKpis(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (!canEditProcess(user, process)) return false;
  if (isAnalystOrAdmin(user.role)) return true;
  return PHASE_3_STATUSES.includes(process.status);
}

export function canViewProcess(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (isAnalystOrAdmin(user.role)) return true;
  if (process.status === 'APPROVED') return true;
  if (process.managerId === user.id) return true;
  if (process.ownerId === user.id) return true;
  return false;
}
