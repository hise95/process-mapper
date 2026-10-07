import re

# Fix seed-more.ts with direct as any on problematic lines
with open("prisma/seed-more.ts", "r") as f:
    code = f.read()
code = code.replace("processType: type,", "processType: type as any,")
code = code.replace("status: status,", "status: status as any,")
code = code.replace("stage,", "stage: stage as any,")
code = code.replace("assignedToRole: role,", "assignedToRole: role as any,")
with open("prisma/seed-more.ts", "w") as f:
    f.write(code)

# Fix seed-statuses.ts
with open("seed-statuses.ts", "r") as f:
    code = f.read()
code = code.replace("status: s,", "status: s as any,")
with open("seed-statuses.ts", "w") as f:
    f.write(code)

# Fix workflow.ts - the updateMany where clause
with open("src/lib/workflow.ts", "r") as f:
    code = f.read()
# Find the updateMany where and cast status
code = code.replace(
    "where: {\n        id,\n        status: expectedCurrentStatus,\n      }",
    "where: {\n        id,\n        status: expectedCurrentStatus as any,\n      }"
)
with open("src/lib/workflow.ts", "w") as f:
    f.write(code)

print("Fixed remaining errors")
