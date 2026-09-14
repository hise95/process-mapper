// src/lib/permissions.ts
// RBAC — перевірки доступу для всіх ролей
import type { SessionUser } from './auth'
import type { Process } from '@prisma/client'
import { Role } from './enums';

// ── Ролі ──
export const ROLES_UA: Record<Role, string> = {
  ADMIN_ANALYST: 'Адміністратор-аналітик',
  PROCESS_MANAGER: 'Менеджер процесу',
  PROCESS_OWNER: 'Власник процесу',
  EMPLOYEE: 'Працівник',
}

// ── Перевірки ──

export function canCreateProcess(user: SessionUser): boolean {
  return user.role === Role.ADMIN_ANALYST || user.role === Role.PROCESS_MANAGER || user.role === Role.PROCESS_OWNER
}

export function canEditProcess(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (process.status === 'APPROVED' || process.status === 'ARCHIVED') return false
  if (user.role === Role.ADMIN_ANALYST) return true
  if (user.role === Role.PROCESS_MANAGER) {
    return !process.managerId || process.managerId === user.id
  }
  if (user.role === Role.PROCESS_OWNER) {
    return !process.ownerId || process.ownerId === user.id
  }
  return false
}

export function canSubmitForReview(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (process.status !== 'DRAFT') return false
  if (user.role === Role.ADMIN_ANALYST) return true
  if (user.role === Role.PROCESS_MANAGER && process.managerId === user.id) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}

export function canApproveAsAnalyst(user: SessionUser): boolean {
  return user.role === Role.ADMIN_ANALYST
}

export function canApproveAsOwner(user: SessionUser, process: Pick<Process, 'ownerId'>): boolean {
  if (user.role === Role.ADMIN_ANALYST) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}

export function canViewAdminPanel(user: SessionUser): boolean {
  return user.role === Role.ADMIN_ANALYST
}

export function canViewRepository(_user: SessionUser): boolean {
  return true // Усі ролі мають доступ до репозиторію
}

/** Чи може користувач створити нову версію APPROVED процесу */
export function canCreateNewVersion(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  if (process.status !== 'APPROVED') return false
  if (user.role === Role.ADMIN_ANALYST) return true
  if (user.role === Role.PROCESS_MANAGER && process.managerId === user.id) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}
