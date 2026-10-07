import sys

with open("src/app/api/processes/[id]/approve/route.ts", "r") as f:
    code = f.read()

import re

# Add Zod import
code = code.replace("import { ProcessStatus } from '\''@/lib/enums'\'';", "import { ProcessStatus } from '\''@/lib/enums'\'';\nimport { z } from '\''zod'\'';")

old_body = """  const { transition, comment }: { transition: WorkflowTransition; comment?: string } = await req.json()"""

new_body = """  const rawBody = await req.json().catch(() => ({}));
  const approveSchema = z.object({
    transition: z.string(),
    comment: z.string().max(1000, 'Коментар занадто довгий').optional().nullable()
  });
  
  const parseResult = approveSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Некоректні дані', details: parseResult.error.format() }, { status: 400 });
  }
  
  const transition = parseResult.data.transition as WorkflowTransition;
  const comment = parseResult.data.comment || undefined;"""

if old_body in code:
    code = code.replace(old_body, new_body)
    with open("src/app/api/processes/[id]/approve/route.ts", "w") as f:
        f.write(code)
    print("Patched approve route")
else:
    print("Could not find approve block")
