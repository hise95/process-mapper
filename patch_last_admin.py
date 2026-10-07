import sys

with open("src/app/api/users/route.ts", "r") as f:
    code = f.read()

import re

# PATCH
old_patch = """    // Не можна змінити роль самому собі
    if (userId === session.id) {
      return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 400 })
    }
    const validRoles = Object.values(Role)"""

new_patch = """    // Не можна змінити роль самому собі
    if (userId === session.id) {
      return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 400 })
    }
    
    // Захист від administrative lockout: не можна понизити останнього адміністратора
    if (role !== 'ADMIN') {
      const targetUser = await prisma.user.findUnique({ where: { id: userId } });
      if (targetUser && targetUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          return NextResponse.json({ error: 'Неможливо понизити останнього адміністратора (Administrative Lockout Protection)' }, { status: 400 });
        }
      }
    }

    const validRoles = Object.values(Role)"""
code = code.replace(old_patch, new_patch)

# DELETE
old_delete = """  if (userId === session.id) return NextResponse.json({ error: 'Не можна видалити самого себе' }, { status: 400 })

  await prisma.user.delete({"""

new_delete = """  if (userId === session.id) return NextResponse.json({ error: 'Не можна видалити самого себе' }, { status: 400 })

  // Захист від administrative lockout: не можна видалити останнього адміністратора
  const targetUserToDelete = await prisma.user.findUnique({ where: { id: userId } });
  if (targetUserToDelete && targetUserToDelete.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Неможливо видалити останнього адміністратора (Administrative Lockout Protection)' }, { status: 400 });
    }
  }

  await prisma.user.delete({"""
code = code.replace(old_delete, new_delete)

with open("src/app/api/users/route.ts", "w") as f:
    f.write(code)
print("Patched last admin protection")
