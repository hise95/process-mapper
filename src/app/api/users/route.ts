import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, getSudoSession, verifyCurrentPassword } from '@/lib/auth'
import { canViewAdminPanel, canManageUsers, canViewFullUsers, isEmployee } from '@/lib/permissions'
import { Role } from '../../../lib/enums'
import bcrypt from 'bcrypt'
import { logSecurityEvent } from '@/lib/audit'
import { isCompromisedPassword, checkPasswordHistory, savePasswordHistory } from '@/lib/passwordChecker'

function validatePassword(password: string): string | null {
  // CWE-521: Weak Password Requirements
  // Впроваджено сувору Enterprise-політику паролів
  if (password.length < 12) return 'Пароль має містити щонайменше 12 символів';
  if (password.length > 72) return 'Пароль занадто довгий (максимум 72 символи для безпеки bcrypt)';
  
  if (!/[a-z]/.test(password)) return 'Пароль має містити щонайменше одну малу літеру';
  if (!/[A-Z]/.test(password)) return 'Пароль має містити щонайменше одну велику літеру';
  if (!/[0-9]/.test(password)) return 'Пароль має містити щонайменше одну цифру';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Пароль має містити щонайменше один спеціальний символ';
  
  return null;
}


export async function GET(_req: NextRequest) {
  const session = await requireSession().catch(() => null)
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 })

  // CWE-200: Excessive Data Exposure (Point 19)
  // Працівники не мають доступу до списку користувачів взагалі
  if (isEmployee(session.role)) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }

  // Аналітики та Адміни бачать повний профіль для управління
  if (canViewFullUsers(session)) {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
      orderBy: { fullName: 'asc' },
    })
    return NextResponse.json(users)
  }

  // Власники та Менеджери процесів бачать лише мінімальну інформацію,
  // необхідну для dropdown-списків (без ролей та дати створення)
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  if (!canManageUsers(session)) return NextResponse.json({ error: 'Тільки системний адміністратор може створювати користувачів' }, { status: 403 })

  const body = await req.json();
  let { email, password, fullName, role, currentPassword } = body;
  if (email) email = email.trim().toLowerCase(); // CWE-178
  if (!email || !password || !fullName || !role) {
    return NextResponse.json({ error: 'Всі поля обов\'язкові' }, { status: 400 })
  }
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для створення користувача необхідно підтвердити дію поточним паролем' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }

  const pwdError = validatePassword(password)
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 })
  }

  const validRoles = Object.values(Role)
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Недійсна роль' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Користувач з таким email вже існує' }, { status: 400 })
  }

  if (await isCompromisedPassword(password)) {
    return NextResponse.json({ error: 'Цей пароль було скомпрометовано у відомих витоках даних. Оберіть інший.' }, { status: 400 })
  }
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, fullName, role },
    select: { id: true, email: true, fullName: true, role: true },
  })

  await logSecurityEvent({ action: 'USER_CREATE', userId: session.id, targetId: user.id, meta: { newRole: role } });
  await savePasswordHistory(user.id, hashedPassword);

  return NextResponse.json(user, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  const bodyPatch = await req.json();
  let { userId, role, password, email, fullName, currentPassword } = bodyPatch;

  // Allow users to change their OWN password/info even if they are not admins (or if they have forcePasswordReset)
  const isSelfUpdate = userId === session.id;
  const isAdmin = session.role === 'ADMIN' && !session.forcePasswordReset;

  if (!isAdmin && !isSelfUpdate) {
    return NextResponse.json({ error: 'Доступ заборонено' }, { status: 403 })
  }
  
  if (isSelfUpdate && role && role !== session.role) {
    return NextResponse.json({ error: 'Не можна змінити власну роль' }, { status: 400 })
  }
  if (email) email = email.trim().toLowerCase(); // CWE-178
  if (!userId) return NextResponse.json({ error: 'userId обов\'язковий' }, { status: 400 })
  
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для виконання цієї дії необхідно ввести поточний пароль (Re-authentication)' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }

  const dataToUpdate: any = {}

  if (role) {
    // Не можна змінити роль самому собі
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

    const validRoles = Object.values(Role)
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Недійсна роль' }, { status: 400 })
    }
    dataToUpdate.role = role
  }

  // Тільки адміністратор може міняти пароль або email іншим
  if (password || email || fullName) {
    if (!canManageUsers(session)) {
       return NextResponse.json({ error: 'Тільки системний адміністратор може змінювати дані користувача' }, { status: 403 })
    }
    if (password) {
      const pwdError = validatePassword(password)
      if (pwdError) return NextResponse.json({ error: pwdError }, { status: 400 })
      if (await isCompromisedPassword(password)) {
        return NextResponse.json({ error: 'Цей пароль було скомпрометовано у відомих витоках даних. Оберіть інший.' }, { status: 400 })
      }
      if (await checkPasswordHistory(userId, password)) {
        return NextResponse.json({ error: 'Цей пароль вже використовувався нещодавно (Password History). Оберіть новий.' }, { status: 400 })
      }
      dataToUpdate.password = await bcrypt.hash(password, 12)
      // Forced reset on next login because admin changed it
      if (userId !== session.id) {
        dataToUpdate.forcePasswordReset = true
      } else {
        dataToUpdate.forcePasswordReset = false
      }
    }
    if (email) dataToUpdate.email = email
    if (fullName) dataToUpdate.fullName = fullName
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: { id: true, email: true, fullName: true, role: true },
  })
  
  if (dataToUpdate.password) {
     await savePasswordHistory(userId, dataToUpdate.password);
  }

  if (role) {
    await logSecurityEvent({ action: 'ROLE_CHANGE', userId: session.id, targetId: userId, meta: { newRole: role } });
  }
  if (password) {
    await logSecurityEvent({ action: 'PASSWORD_RESET', userId: session.id, targetId: userId });
  }

  // Якщо пароль, роль або EMAIL змінено, відкликаємо всі активні сесії цього користувача (CWE-613 Revocation)
  // Email є основним ідентифікатором (identity/login), тому його зміна вимагає переавторизації.
  if (password || role || email) {
    await prisma.session.deleteMany({
      where: { userId }
    });
  }

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest) {
  const { user: session, sudoRequired } = await getSudoSession();
  if (!session) return NextResponse.json({ error: 'Не авторизовано' }, { status: 401 });
  if (sudoRequired) return NextResponse.json({ error: 'Для виконання критичної операції потрібно знову підтвердити особу (Step-up Auth). Будь ласка, перезайдіть в систему.' }, { status: 403 });
  if (!canManageUsers(session)) return NextResponse.json({ error: 'Тільки системний адміністратор може видаляти користувачів' }, { status: 403 })

  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  
  // Для DELETE ми не завжди маємо body, але можемо перевірити currentPassword з хедерів або body.
  // Оскільки DELETE у Fetch API може мати body, давайте читати його.
  const body = await req.json().catch(() => ({}));
  const currentPassword = body.currentPassword;
  
  if (!userId) return NextResponse.json({ error: 'userId обов\'язковий' }, { status: 400 })
  
  if (!currentPassword) {
    return NextResponse.json({ error: 'Для виконання цієї дії необхідно ввести поточний пароль (Re-authentication)' }, { status: 401 });
  }
  const isPasswordValid = await verifyCurrentPassword(session.id, currentPassword);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Невірний поточний пароль' }, { status: 401 });
  }
  if (userId === session.id) return NextResponse.json({ error: 'Не можна видалити самого себе' }, { status: 400 })

  // Захист від administrative lockout: не можна видалити останнього адміністратора
  const targetUserToDelete = await prisma.user.findUnique({ where: { id: userId } });
  if (targetUserToDelete && targetUserToDelete.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Неможливо видалити останнього адміністратора (Administrative Lockout Protection)' }, { status: 400 });
    }
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  await logSecurityEvent({ action: 'USER_DELETE', userId: session.id, targetId: userId });

  return NextResponse.json({ success: true })
}
