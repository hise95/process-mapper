import sys

def patch_post():
    with open("src/app/api/processes/route.ts", "r") as f:
        code = f.read()

    old_post = """    const process = await prisma.process.create({
      data: {
        title,
        processType: processType ?? 'MAIN',
        levelId: levelId || null,
        ownerId: ownerId || null,
        managerId: managerId || session.id,"""

    new_post = """    let finalOwnerId = ownerId || null;
    let finalManagerId = managerId || session.id;

    // CWE-915 / CWE-862: Mass assignment & ownership validation
    if (ownerId && session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST') {
      if (session.role === 'PROCESS_OWNER') {
        finalOwnerId = session.id; // Owner can only assign themselves
      } else {
        return NextResponse.json({ error: 'Тільки аналітик або власник може призначати ownerId' }, { status: 403 })
      }
    }

    if (managerId && managerId !== session.id && session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST' && session.role !== 'PROCESS_OWNER') {
      return NextResponse.json({ error: 'Ви не маєте права призначати іншого менеджера' }, { status: 403 })
    }

    if (finalOwnerId) {
      const ownerUser = await prisma.user.findUnique({ where: { id: finalOwnerId } });
      if (!ownerUser || (ownerUser.role !== 'PROCESS_OWNER' && ownerUser.role !== 'ADMIN' && ownerUser.role !== 'PROCESS_ANALYST')) {
        return NextResponse.json({ error: 'Користувач для ownerId не має ролі Власника' }, { status: 400 });
      }
    }

    if (finalManagerId) {
      const managerUser = await prisma.user.findUnique({ where: { id: finalManagerId } });
      if (!managerUser || (managerUser.role !== 'PROCESS_MANAGER' && managerUser.role !== 'PROCESS_OWNER' && managerUser.role !== 'ADMIN' && managerUser.role !== 'PROCESS_ANALYST')) {
        return NextResponse.json({ error: 'Користувач для managerId не має відповідної ролі' }, { status: 400 });
      }
    }

    const process = await prisma.process.create({
      data: {
        title,
        processType: processType ?? 'MAIN',
        levelId: levelId || null,
        ownerId: finalOwnerId,
        managerId: finalManagerId,"""

    if old_post in code:
        code = code.replace(old_post, new_post)
        with open("src/app/api/processes/route.ts", "w") as f:
            f.write(code)
        print("Patched POST")
    else:
        print("Could not find POST block")
        sys.exit(1)


def patch_patch():
    with open("src/app/api/processes/[id]/route.ts", "r") as f:
        code = f.read()

    old_patch = """    // Перевірити рівень якщо змінюється
    if (data.levelId) {"""

    new_patch = """    // CWE-915 / CWE-862: Validate Ownership Changes (Mass Assignment)
    if ('ownerId' in data && data.ownerId !== process.ownerId) {
      if (session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST') {
        return NextResponse.json({ error: 'Тільки аналітик або адміністратор може змінювати власника процесу' }, { status: 403 })
      }
      if (data.ownerId !== null) {
        const ownerUser = await prisma.user.findUnique({ where: { id: data.ownerId as string } });
        if (!ownerUser || (ownerUser.role !== 'PROCESS_OWNER' && ownerUser.role !== 'ADMIN' && ownerUser.role !== 'PROCESS_ANALYST')) {
          return NextResponse.json({ error: 'Користувач для ownerId не має ролі Власника' }, { status: 400 });
        }
      }
    }

    if ('managerId' in data && data.managerId !== process.managerId) {
      if (session.role !== 'ADMIN' && session.role !== 'PROCESS_ANALYST' && session.role !== 'PROCESS_OWNER') {
        return NextResponse.json({ error: 'Тільки власник або аналітик може призначати менеджера' }, { status: 403 })
      }
      if (session.role === 'PROCESS_OWNER' && process.ownerId !== session.id) {
        return NextResponse.json({ error: 'Ви можете призначати менеджера тільки для своїх процесів' }, { status: 403 })
      }
      if (data.managerId !== null) {
        const managerUser = await prisma.user.findUnique({ where: { id: data.managerId as string } });
        if (!managerUser || (managerUser.role !== 'PROCESS_MANAGER' && managerUser.role !== 'PROCESS_OWNER' && managerUser.role !== 'ADMIN' && managerUser.role !== 'PROCESS_ANALYST')) {
          return NextResponse.json({ error: 'Користувач для managerId не має відповідної ролі' }, { status: 400 });
        }
      }
    }

    // Перевірити рівень якщо змінюється
    if (data.levelId) {"""

    if old_patch in code:
        code = code.replace(old_patch, new_patch)
        with open("src/app/api/processes/[id]/route.ts", "w") as f:
            f.write(code)
        print("Patched PATCH")
    else:
        print("Could not find PATCH block")
        sys.exit(1)

patch_post()
patch_patch()
