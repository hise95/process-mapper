import sys

with open("src/app/api/processes/[id]/route.ts", "r") as f:
    code = f.read()

import re

old_imp = "import { canEditProcess, canEditPassport, canEditSteps, canViewProcess } from '@/lib/permissions'"
new_imp = "import { canEditProcess, canEditPassport, canEditSteps, canViewProcess, canAssignProcessManager, canAssignProcessOwner, isAdmin, isOwner } from '@/lib/permissions'"
code = code.replace(old_imp, new_imp)

# Fix the const isAdmin = isAdmin(...)
code = code.replace("const isAdmin = isAdmin(session.role)", "const isUserAdmin = isAdmin(session.role)")
code = code.replace("await logSecurityEvent({ action: 'PROCESS_DELETE', userId: session.id, targetId: id, details: `Process deleted by ${isAdmin ? 'Admin' : 'Owner'}` });", "await logSecurityEvent({ action: 'PROCESS_DELETE', userId: session.id, targetId: id, details: `Process deleted by ${isUserAdmin ? 'Admin' : 'Owner'}` });")

with open("src/app/api/processes/[id]/route.ts", "w") as f:
    f.write(code)
print("Fixed imports")
