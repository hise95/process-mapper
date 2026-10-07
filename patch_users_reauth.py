import sys

with open("src/app/api/users/route.ts", "r") as f:
    code = f.read()

import re

# Import verifyCurrentPassword
code = code.replace("import { requireSession, getSudoSession } from '@/lib/auth'", "import { requireSession, getSudoSession, verifyCurrentPassword } from '@/lib/auth'")

# PATCH
old_patch = """  const { userId, role, password, email, fullName } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId обов\\'язковий' }, { status: 400 })"""

new_patch = """  const { userId, role, password, email, fullName, currentPassword } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId обов\\'язковий' }, { status: 400 })
  
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для виконання цієї дії необхідно ввести поточний пароль (Re-authentication)' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }"""
code = code.replace(old_patch, new_patch)

# DELETE
old_delete = """  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) return NextResponse.json({ error: 'userId обов\\'язковий' }, { status: 400 })"""

new_delete = """  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  
  // Для DELETE ми не завжди маємо body, але можемо перевірити currentPassword з хедерів або body.
  // Оскільки DELETE у Fetch API може мати body, давайте читати його.
  const body = await req.json().catch(() => ({}));
  const currentPassword = body.currentPassword;
  
  if (!userId) return NextResponse.json({ error: 'userId обов\\'язковий' }, { status: 400 })
  
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для виконання цієї дії необхідно ввести поточний пароль (Re-authentication)' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }"""
code = code.replace(old_delete, new_delete)

# POST (Створення нового користувача)
old_post = """  const { email, password, fullName, role } = await req.json()
  if (!email || !password || !fullName || !role) {"""

new_post = """  const { email, password, fullName, role, currentPassword } = await req.json()
  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: 'Всі поля обов\\'язкові' }, { status: 400 })
  }
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для створення користувача необхідно підтвердити дію поточним паролем' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }"""
code = code.replace(old_post, new_post)
code = code.replace("  if (!email || !password || !fullName || !role) {\n    return NextResponse.json({ error: 'Всі поля обов\\'язкові' }, { status: 400 })\n  }\n  if (!email || !password || !fullName || !role) {", "  if (!email || !password || !fullName || !role) {")

with open("src/app/api/users/route.ts", "w") as f:
    f.write(code)
print("Patched users route for re-authentication")
