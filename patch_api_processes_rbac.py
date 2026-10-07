import sys
import re

with open("src/app/api/processes/route.ts", "r") as f:
    code = f.read()

# Import helpers
old_import = "import { canCreateProcess, isAnalystOrAdmin } from '@/lib/permissions'"
new_import = "import { canCreateProcess, isAnalystOrAdmin, isManager, isOwner, isEmployee, canAssignProcessOwner, canAssignProcessManager } from '@/lib/permissions'"
code = code.replace(old_import, new_import)

# Replace Role comparisons
code = code.replace("session.role === Role.PROCESS_MANAGER", "isManager(session.role)")
code = code.replace("session.role === Role.PROCESS_OWNER", "isOwner(session.role)")
code = code.replace("session.role === Role.EMPLOYEE", "isEmployee(session.role)")
code = code.replace("session.role !== Role.EMPLOYEE", "!isEmployee(session.role)")
code = code.replace("session.role === 'PROCESS_OWNER'", "isOwner(session.role)")
code = code.replace("session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST' && session.role !== 'PROCESS_OWNER'", "!canAssignProcessManager(session)")
code = code.replace("session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST'", "!canAssignProcessOwner(session)")

with open("src/app/api/processes/route.ts", "w") as f:
    f.write(code)

with open("src/app/api/processes/[id]/route.ts", "r") as f:
    code = f.read()

old_import_id = "import { canEditProcess, canSubmitForReview, canCreateNewVersion, isAnalystOrAdmin } from '@/lib/permissions'"
new_import_id = "import { canEditProcess, canSubmitForReview, canCreateNewVersion, isAnalystOrAdmin, canAssignProcessManager, canAssignProcessOwner, isAdmin, isOwner } from '@/lib/permissions'"
code = code.replace(old_import_id, new_import_id)

code = code.replace("session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST' && session.role !== 'PROCESS_OWNER'", "!canAssignProcessManager(session)")
code = code.replace("session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST'", "!canAssignProcessOwner(session)")
code = code.replace("session.role === 'PROCESS_OWNER'", "isOwner(session.role)")
code = code.replace("session.role === 'ADMIN'", "isAdmin(session.role)")

with open("src/app/api/processes/[id]/route.ts", "w") as f:
    f.write(code)

print("Patched processes routes RBAC")
