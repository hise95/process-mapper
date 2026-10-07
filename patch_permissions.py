import sys
import re

with open("src/lib/permissions.ts", "r") as f:
    code = f.read()

helpers = """
// ── Базові перевірки ролей ──
export const isAdmin = (role: string) => role === Role.ADMIN;
export const isAnalyst = (role: string) => role === Role.PROCESS_ANALYST;
export const isManager = (role: string) => role === Role.PROCESS_MANAGER;
export const isOwner = (role: string) => role === Role.PROCESS_OWNER;
export const isEmployee = (role: string) => role === Role.EMPLOYEE;

// ── Семантичні перевірки для користувачів ──
export function canManageUsers(user: SessionUser): boolean {
  return isAdmin(user.role);
}

export function canViewFullUsers(user: SessionUser): boolean {
  return isAnalystOrAdmin(user.role);
}

export function canAssignProcessOwner(user: SessionUser): boolean {
  return isAnalystOrAdmin(user.role) || isOwner(user.role);
}

export function canAssignProcessManager(user: SessionUser): boolean {
  return isAnalystOrAdmin(user.role) || isOwner(user.role) || isManager(user.role);
}
"""

code = code.replace("export const isAnalystRole = isAnalystOrAdmin;", "export const isAnalystRole = isAnalystOrAdmin;\n" + helpers)

with open("src/lib/permissions.ts", "w") as f:
    f.write(code)
print("Added semantic helpers to permissions.ts")
