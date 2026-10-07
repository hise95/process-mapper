import sys
import re

with open("src/app/api/users/route.ts", "r") as f:
    code = f.read()

# Add getSudoSession import
code = code.replace("import { requireSession } from '@/lib/auth'", "import { requireSession, getSudoSession } from '@/lib/auth'")

# Replace in POST
old_post = """export async function POST(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може створювати користувачів' }, { status: 403 })"""

new_post = """export async function POST(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може створювати користувачів' }, { status: 403 })"""

code = code.replace(old_post, new_post)

# Replace in PATCH
old_patch = """export async function PATCH(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })"""

new_patch = """export async function PATCH(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  if (!canViewAdminPanel(session)) return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })"""

code = code.replace(old_patch, new_patch)

# Replace in DELETE
old_delete = """export async function DELETE(req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може видаляти користувачів' }, { status: 403 })"""

new_delete = """export async function DELETE(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Тільки системний адміністратор може видаляти користувачів' }, { status: 403 })"""

code = code.replace(old_delete, new_delete)

with open("src/app/api/users/route.ts", "w") as f:
    f.write(code)
print("Patched users route for Sudo")
