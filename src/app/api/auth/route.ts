import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE_NAME, buildSessionCookieValue } from '@/lib/auth'
import { authenticate } from 'ldap-authentication'
import bcrypt from 'bcrypt'
import { logSecurityEvent } from '@/lib/audit'
import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/ip'

export async function POST(req: NextRequest) {
  try {
    // 1. Per-IP Rate Limit (захист від масового брутфорсу / DDoS)
        // CWE-345 / CWE-307: Безпечне отримання IP без вразливості до підміни X-Forwarded-For
    const ip = getClientIp(req);
    const ipLimit = await checkRateLimit(`login_ip_${ip}`, 20, 15 * 60 * 1000); // 20 спроб на 15 хв
    
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Забагато спроб входу з цієї IP-адреси. Спробуйте пізніше.' }, { status: 429, headers: { 'Retry-After': '900' } });
    }

    const body = await req.json();
    let email = body.email;
    if (email) email = email.trim().toLowerCase(); // CWE-178: Canonicalize email
    const password = body.password;
    
    if (email) {
      // 2. Per-Account Rate Limit (захист від password spraying для конкретного юзера)
      const emailLimit = await checkRateLimit(`login_email_${email}`, 5, 5 * 60 * 1000); // 5 спроб на 5 хв
      if (!emailLimit.allowed) {
        // CWE-204: Generic error to prevent lockout enumeration
        return NextResponse.json({ error: 'Невірний email або пароль, або акаунт тимчасово заблоковано' }, { status: 401 });
      }
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email та пароль обов\'язкові' }, { status: 400 })
    }

    let authenticatedViaLdap = false
    let ldapFullName = null

    // 1. Спроба авторизації через LDAP (якщо налаштовано)
    if (process.env.LDAP_URL) {
      if (process.env.NODE_ENV === 'production' && !process.env.LDAP_URL.startsWith('ldaps://')) {
        console.error('FATAL: Insecure LDAP (ldap://) is disabled in production. Use ldaps:// (LDAP over SSL) to prevent cleartext credential transmission (CWE-319).');
        return NextResponse.json({ error: 'Помилка конфігурації: Небезпечне з’єднання LDAP заборонено у production.' }, { status: 500 });
      }
      try {
        const usernameAttribute = process.env.LDAP_USERNAME_ATTRIBUTE || 'userPrincipalName'
        const baseFilter = process.env.LDAP_SEARCH_FILTER
        
        // CWE-90: LDAP Injection Configuration Validation
        if (!/^[a-zA-Z0-9_-]+$/.test(usernameAttribute)) {
          console.error('FATAL (CWE-90): LDAP_USERNAME_ATTRIBUTE contains invalid characters.');
          return NextResponse.json({ error: 'Помилка конфігурації LDAP'}, { status: 500 });
        }
        
        // RFC 4515 LDAP Escaping
        const escapedEmail = email.replace(/[\\*()\0]/g, (c: string) => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));

        let usernameFilter: string | undefined = undefined
        if (baseFilter) {
          let open = 0;
          for (const char of baseFilter) {
            if (char === '(') open++;
            if (char === ')') open--;
            if (open < 0) break;
          }
          if (open !== 0 || !baseFilter.startsWith('(') || !baseFilter.endsWith(')')) {
            console.error('FATAL (CWE-90): LDAP_SEARCH_FILTER is not enclosed correctly.');
            return NextResponse.json({ error: 'Помилка конфігурації LDAP'}, { status: 500 });
          }
          // Поєднуємо екранований email. Ми використовуємо {{username}},
          // якщо бібліотека ldap-authentication його потребує. АЛЕ! Бібліотека `ldap-authentication`
          // сама робить .replace('{{username}}', username). Це означає, що вона вставить 
          // НЕ-екранований email! Тому ми передаємо у опції бібліотеці `username: escapedEmail`, 
          // щоб вона замінила {{username}} на екранований варіант.
          // АЛЕ якщо вона використовує `username` для bind, то bind впаде!
          // Тому ми краще не будемо використовувати {{username}}, а створимо фільтр самі,
          // і не передаватимемо usernameFilter бібліотеці. (Або передамо такий, що не містить {{username}}).
          usernameFilter = `(&${baseFilter}(${usernameAttribute}=${escapedEmail}))`
        } else {
          usernameFilter = `(${usernameAttribute}=${escapedEmail})`
        }

        const authOptions: any = {
          ldapOpts: { url: process.env.LDAP_URL },
          userPassword: password,
          userSearchBase: process.env.LDAP_BASE_DN || '',
          usernameAttribute,
          usernameFilter,
          username: email,
        }

        // Якщо вказані дані службового юзера - використовуємо Admin mode,
        // інакше пробуємо Self mode (userDn = email)
        if (process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD) {
          authOptions.adminDn = process.env.LDAP_BIND_DN
          authOptions.adminPassword = process.env.LDAP_BIND_PASSWORD
        } else {
          authOptions.userDn = email
        }

        const ldapUser = await authenticate(authOptions)
        authenticatedViaLdap = true
        if (ldapUser && (ldapUser.displayName || ldapUser.cn)) {
          ldapFullName = ldapUser.displayName || ldapUser.cn
        }
      } catch (error: any) {
        // Не логуємо пароль — тільки email та повідомлення помилки
        console.warn('LDAP auth failed for', email, ':', error?.message);
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP failure for ${email}` });
        
        // CWE-287/639: Якщо LDAP налаштовано, він є ЄДИНИМ джерелом правди.
        // Забороняємо будь-який fallback на локальні паролі. 
        // Break-glass вбудований в код - це security vulnerability.
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email} (LDAP enforced)` });
        return NextResponse.json({ error: 'Невірний email або пароль, або акаунт тимчасово заблоковано' }, { status: 401 });
      }
    }

    // 2. Перевірка локальної бази
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, fullName: true, role: true, authSource: true },
    })

    // Прибрано автоматичне створення першого адміна. 
    // Сисадмін повинен створити його вручну через скрипт або CLI.

    if (authenticatedViaLdap) {
      // CWE-863 / Lifecycle: Скасовано автоматичне JIT-створення (Just-In-Time) користувачів.
      // Користувач повинен бути попередньо зареєстрований адміністратором у локальній БД,
      // щоб забезпечити надійний lifecycle/deprovisioning контроль.
      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP success but local account missing for ${email}` });
        return NextResponse.json({ error: 'Акаунт не знайдено в локальній базі. Зверніться до адміністратора для доступу.' }, { status: 403 })
      }
      
      // CWE-xxx: Суворе розділення ідентичностей. LOCAL-акаунти не можуть бути захоплені через LDAP.
      if (user.authSource !== 'LDAP') {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP success but account ${email} is marked as LOCAL` });
        return NextResponse.json({ error: 'Цей акаунт налаштовано тільки для локального входу. Конфлікт ідентичностей.' }, { status: 403 })
      }
    } else {
      // Локальна авторизація: перевіряємо bcrypt-хеш
      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` });
          return NextResponse.json({ error: 'Невірний email або пароль, або акаунт тимчасово заблоковано' }, { status: 401 });
      }
      
      // CWE-xxx: Розділення ідентичностей. LDAP-акаунти не можуть логінитися локально.
      if (user.authSource === 'LDAP') {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Attempt to locally login into LDAP account ${email}` });
        return NextResponse.json({ error: 'Цей акаунт налаштовано для входу через корпоративну мережу (LDAP).' }, { status: 403 })
      }
      // Тільки bcrypt-хеші є дійсними. Якщо хеш не bcrypt — пароль недійсний.
      if (!user.password.startsWith('$2')) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` });
          return NextResponse.json({ error: 'Невірний email або пароль, або акаунт тимчасово заблоковано' }, { status: 401 });
      }
      const isValidPassword = await bcrypt.compare(password, user.password)

      if (!isValidPassword) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` });
          return NextResponse.json({ error: 'Невірний email або пароль, або акаунт тимчасово заблоковано' }, { status: 401 });
      }
    }

    // Очищуємо ліміт для цього акаунта після успішного входу
    await clearRateLimit(`login_email_${email}`);
    await logSecurityEvent({ action: 'LOGIN_SUCCESS', userId: user!.id, ip, details: `User logged in` });
    await logSecurityEvent({ action: 'SESSION_ISSUANCE', userId: user!.id, ip, details: `Session issued via POST /api/auth` });

    const response = NextResponse.json({
      success: true,
      user: { id: user!.id, email: user!.email, fullName: user!.fullName, role: user!.role }
    })

    // CWE-xxxx: Session Context and Telemetry (вимоги аудиту)
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const authMethod = authenticatedViaLdap ? 'LDAP' : 'LOCAL';
    const sessionCookieValue = await buildSessionCookieValue(user!.id, ip, userAgent, authMethod);
    
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8, // 8 годин
    })

    return response
  } catch (error: any) {
    console.error('Auth error:', error?.message)
    return NextResponse.json({ error: 'Помилка авторизації на сервері' }, { status: 500 })
  }
}

import { cookies } from 'next/headers'
import { verifyValue } from '@/lib/auth'

export async function DELETE() {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (cookieValue) {
    // Верифікуємо HMAC підпис перед тим, як довіряти ID для видалення (CWE-345)
    const sessionId = verifyValue(cookieValue)
    if (sessionId) {
      await prisma.session.deleteMany({ where: { id: sessionId } })
    }
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

