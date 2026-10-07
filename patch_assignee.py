import sys

# Patch POST
with open("src/app/api/analyst-tasks/route.ts", "r") as f:
    code = f.read()

old_post_assignee = """  const { title, description, assigneeId } = parseResult.data;

  const task = await prisma.analystTask.create({"""

new_post_assignee = """  const { title, description, assigneeId } = parseResult.data;

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      return NextResponse.json({ error: 'Призначений користувач не існує' }, { status: 400 });
    }
    if (!isAnalystOrAdmin(assignee.role)) {
      return NextResponse.json({ error: 'Задачу можна призначити лише Аналітику або Адміністратору' }, { status: 400 });
    }
  }

  const task = await prisma.analystTask.create({"""

if old_post_assignee in code:
    code = code.replace(old_post_assignee, new_post_assignee)
    with open("src/app/api/analyst-tasks/route.ts", "w") as f:
        f.write(code)
    print("Patched POST route")
else:
    print("Could not find POST block")

# Patch PATCH
with open("src/app/api/analyst-tasks/[id]/route.ts", "r") as f:
    code2 = f.read()

old_patch_assignee = """  const { status, title, description, assigneeId } = parseResult.data;

  const task = await prisma.analystTask.update({"""

new_patch_assignee = """  const { status, title, description, assigneeId } = parseResult.data;

  if (assigneeId) {
    const assignee = await prisma.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      return NextResponse.json({ error: 'Призначений користувач не існує' }, { status: 400 });
    }
    if (!isAnalystOrAdmin(assignee.role)) {
      return NextResponse.json({ error: 'Задачу можна призначити лише Аналітику або Адміністратору' }, { status: 400 });
    }
  }

  const task = await prisma.analystTask.update({"""

if old_patch_assignee in code2:
    code2 = code2.replace(old_patch_assignee, new_patch_assignee)
    with open("src/app/api/analyst-tasks/[id]/route.ts", "w") as f:
        f.write(code2)
    print("Patched PATCH route")
else:
    print("Could not find PATCH block")
