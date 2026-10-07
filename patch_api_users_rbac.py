import sys
import re

with open("src/app/api/users/route.ts", "r") as f:
    code = f.read()

# Import helpers
old_import = "import { canViewAdminPanel } from '@/lib/permissions'"
new_import = "import { canViewAdminPanel, canManageUsers, canViewFullUsers, isEmployee } from '@/lib/permissions'"
code = code.replace(old_import, new_import)

# Replace GET
code = code.replace("if (session.role === 'EMPLOYEE')", "if (isEmployee(session.role))")
code = code.replace("if (session.role === 'ADMIN' || session.role === 'PROCESS_ANALYST')", "if (canViewFullUsers(session))")

# Replace POST
code = code.replace("if (session.role !== 'ADMIN')", "if (!canManageUsers(session))")

# Replace PATCH
code = code.replace("if (session.role !== 'ADMIN')", "if (!canManageUsers(session))")

# Replace DELETE
code = code.replace("if (session.role !== 'ADMIN')", "if (!canManageUsers(session))")

with open("src/app/api/users/route.ts", "w") as f:
    f.write(code)
print("Patched users route RBAC")
