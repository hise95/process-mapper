import sys

def patch_workflow():
    with open("src/lib/workflow.ts", "r") as f:
        code = f.read()

    old_logic = """  const isAnalyst = user.role === Role.PROCESS_ANALYST || user.role === Role.ADMIN;
  const isOwner = isAnalyst || process.ownerId === user.id;
  const isManager = isAnalyst || process.managerId === user.id;"""

    new_logic = """  // CWE-269: Segregation of Duties (SoD)
  // Аналітик/Адмін не може автоматично виступати Власником чи Менеджером без прямого призначення
  const isAnalyst = user.role === Role.PROCESS_ANALYST || user.role === Role.ADMIN;
  const isOwner = process.ownerId === user.id;
  const isManager = process.managerId === user.id;"""

    if old_logic in code:
        code = code.replace(old_logic, new_logic)
        with open("src/lib/workflow.ts", "w") as f:
            f.write(code)
        print("Patched workflow.ts")
    else:
        print("Failed to patch workflow.ts")
        sys.exit(1)

def patch_permissions():
    with open("src/lib/permissions.ts", "r") as f:
        code = f.read()
    
    # fix canSubmitForReview
    old_submit = """export function canSubmitForReview(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  const draftStatuses = ['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT']
  if (!draftStatuses.includes(process.status)) return false
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_MANAGER && process.managerId === user.id) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}"""
    
    new_submit = """export function canSubmitForReview(user: SessionUser, process: Pick<Process, 'managerId' | 'ownerId' | 'status'>): boolean {
  const draftStatuses = ['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT']
  if (!draftStatuses.includes(process.status)) return false
  
  // CWE-269: Тільки призначені особи можуть відправляти на перевірку
  if (process.managerId === user.id) return true;
  if (process.ownerId === user.id) return true;
  
  // Аналітик може відправити, тільки якщо він безпосередньо призначений менеджером
  return false;
}"""

    if old_submit in code:
        code = code.replace(old_submit, new_submit)
    else:
        print("Failed to patch submit in permissions.ts")

    # fix canApproveAsOwner
    old_approve_owner = """export function canApproveAsOwner(user: SessionUser, process: Pick<Process, 'ownerId'>): boolean {
  if (isAnalystOrAdmin(user.role)) return true
  if (user.role === Role.PROCESS_OWNER && process.ownerId === user.id) return true
  return false
}"""

    new_approve_owner = """export function canApproveAsOwner(user: SessionUser, process: Pick<Process, 'ownerId'>): boolean {
  // CWE-269: Тільки призначений власник може погодити як Власник
  return process.ownerId === user.id;
}"""

    if old_approve_owner in code:
        code = code.replace(old_approve_owner, new_approve_owner)
        with open("src/lib/permissions.ts", "w") as f:
            f.write(code)
        print("Patched permissions.ts")
    else:
        print("Failed to patch canApproveAsOwner in permissions.ts")

patch_workflow()
patch_permissions()
