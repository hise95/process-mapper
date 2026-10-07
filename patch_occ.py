import sys

with open("src/app/api/processes/[id]/route.ts", "r") as f:
    code = f.read()

import re

# PATCH process: Use updateMany for OCC
old_patch_update = """    const updated = await prisma.process.update({ where: { id }, data })

    if (!['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT'].includes(process.status)) {"""

new_patch_update = """    // CWE-362: OCC - Оновлюємо тільки якщо статус не змінився з моменту findUnique
    const updateResult = await prisma.process.updateMany({ 
      where: { id, status: process.status }, 
      data 
    });
    
    if (updateResult.count === 0) {
      return NextResponse.json({ error: 'Конфлікт паралельних запитів: статус або стан процесу був змінений' }, { status: 409 });
    }
    
    const updated = { ...process, ...data }; // Повертаємо очікуваний об'єкт

    if (!['DRAFT', 'STEPS_DRAFT', 'KPIS_DRAFT'].includes(process.status)) {"""
code = code.replace(old_patch_update, new_patch_update)

with open("src/app/api/processes/[id]/route.ts", "w") as f:
    f.write(code)


# Archive process: Use updateMany for OCC
with open("src/app/api/processes/[id]/archive/route.ts", "r") as f:
    code_archive = f.read()

old_archive = """  const updated = await prisma.process.update({
    where: { id },
    data: { status: newStatus },
  });"""

new_archive = """  // CWE-362: OCC
  const updateResult = await prisma.process.updateMany({
    where: { id, status: process.status },
    data: { status: newStatus },
  });
  
  if (updateResult.count === 0) {
    return NextResponse.json({ error: 'Конфлікт паралельних запитів: статус вже змінено' }, { status: 409 });
  }"""
code_archive = code_archive.replace(old_archive, new_archive)
code_archive = code_archive.replace("return NextResponse.json({ success: true, status: updated.status });", "return NextResponse.json({ success: true, status: newStatus });")

with open("src/app/api/processes/[id]/archive/route.ts", "w") as f:
    f.write(code_archive)

# Version process: Add FOR UPDATE lock in workflow.ts createNewVersion
with open("src/lib/workflow.ts", "r") as f:
    code_wf = f.read()

old_wf = """  const newProcess = await prisma.$transaction(async (tx) => {
    const created = await tx.process.create({"""

new_wf = """  const newProcess = await prisma.$transaction(async (tx) => {
    // CWE-362: Блокуємо батьківський запис, щоб уникнути паралельного створення кількох чернеток
    await tx.$executeRaw`SELECT id FROM "Process" WHERE id = ${processId} FOR UPDATE`;
    
    const existingDraft = await tx.process.findFirst({
      where: { previousVersionId: processId, status: { not: 'ARCHIVED' } }
    });
    if (existingDraft) {
      throw new Error('CONCURRENCY_CONFLICT: Чернетка вже існує');
    }

    const created = await tx.process.create({"""
code_wf = code_wf.replace(old_wf, new_wf)

with open("src/lib/workflow.ts", "w") as f:
    f.write(code_wf)

# Version route: Catch CONCURRENCY_CONFLICT
with open("src/app/api/processes/[id]/version/route.ts", "r") as f:
    code_ver = f.read()

old_ver = """  const newId = await createNewVersion(id, session)

  return NextResponse.json({ newVersionId: newId }, { status: 201 })"""

new_ver = """  let newId;
  try {
    newId = await createNewVersion(id, session);
  } catch (err: any) {
    if (err.message && err.message.includes('CONCURRENCY_CONFLICT')) {
      return NextResponse.json({ error: 'Чернетка нової версії вже створена іншим запитом' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ newVersionId: newId }, { status: 201 })"""
code_ver = code_ver.replace(old_ver, new_ver)

with open("src/app/api/processes/[id]/version/route.ts", "w") as f:
    f.write(code_ver)

print("Patched all routes for OCC/TOCTOU")
