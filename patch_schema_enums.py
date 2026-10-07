import sys

with open("prisma/schema.prisma", "r") as f:
    code = f.read()

# 1. Add Prisma enums at the top after datasource block
enums = """
// ─────────────────────────────────────────────
// DB-LEVEL ENUMS (prevent invalid values at storage layer)
// ─────────────────────────────────────────────

enum Role {
  ADMIN
  PROCESS_ANALYST
  PROCESS_MANAGER
  PROCESS_OWNER
  EMPLOYEE
}

enum AuthSource {
  LOCAL
  LDAP
}

enum ProcessStatus {
  DRAFT
  PASSPORT_REVIEW_ANALYST
  PASSPORT_REVIEW_OWNER
  STEPS_DRAFT
  STEPS_REVIEW_ANALYST
  STEPS_REVIEW_OWNER
  KPIS_DRAFT
  KPIS_REVIEW_ANALYST
  KPIS_REVIEW_OWNER
  FINAL_APPROVAL_ANALYST
  APPROVED
  ARCHIVED
}

enum ProcessType {
  MAIN
  MANAGERIAL
  SERVICE
}

enum WorkflowStage {
  PASSPORT_ANALYST_REVIEW
  PASSPORT_OWNER_REVIEW
  STEPS_ANALYST_REVIEW
  STEPS_OWNER_REVIEW
  KPIS_ANALYST_REVIEW
  KPIS_OWNER_REVIEW
  FINAL_APPROVAL
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
}

enum FeedbackStatus {
  OPEN
  RESOLVED
}

enum FeedbackType {
  BUG
  SUGGESTION
  OTHER
}

"""

# Insert enums before first model
code = code.replace("// ─────────────────────────────────────────────\n// MODELS", enums + "// ─────────────────────────────────────────────\n// MODELS")

# 2. Replace String fields with enum types
code = code.replace('role       String   @default("PROCESS_MANAGER")', 'role       Role     @default(PROCESS_MANAGER)')
code = code.replace('authSource String   @default("LOCAL") // "LOCAL" або "LDAP"', 'authSource AuthSource @default(LOCAL)')
code = code.replace('authMethod     String? // LDAP або LOCAL', 'authMethod     AuthSource?')
code = code.replace('processType String @default("MAIN")', 'processType ProcessType @default(MAIN)')
code = code.replace('status            String        @default("DRAFT")', 'status            ProcessStatus @default(DRAFT)')
code = code.replace('  stage          String\n  assignedToRole String', '  stage          WorkflowStage\n  assignedToRole Role')
code = code.replace('  status      String   @default("TODO") // "TODO", "IN_PROGRESS", "DONE"', '  status      TaskStatus @default(TODO)')
code = code.replace('  type         String   // \'BUG\', \'SUGGESTION\', etc.', '  type         FeedbackType')
code = code.replace('  status       String   @default("OPEN") // \'OPEN\', \'RESOLVED\'', '  status       FeedbackStatus @default(OPEN)')

with open("prisma/schema.prisma", "w") as f:
    f.write(code)
print("Patched schema.prisma with DB enums")
