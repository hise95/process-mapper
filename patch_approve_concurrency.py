import sys

with open("src/app/api/processes/[id]/approve/route.ts", "r") as f:
    code = f.read()

import re

old_exec = """  await applyTransition(id, transition, session, comment)

  return NextResponse.json({ success: true })"""

new_exec = """  try {
    // Передаємо process.status як expectedCurrentStatus для OCC-захисту (CWE-362)
    await applyTransition(id, transition, session, comment, process.status)
  } catch (err: any) {
    if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
      return NextResponse.json({ error: 'Конфлікт паралельних запитів: статус вже змінено' }, { status: 409 })
    }
    throw err;
  }

  return NextResponse.json({ success: true })"""

code = code.replace(old_exec, new_exec)

with open("src/app/api/processes/[id]/approve/route.ts", "w") as f:
    f.write(code)
print("Patched route.ts for OCC")
