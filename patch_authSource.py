import sys
import re

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

code = code.replace(
    "select: { id: true, email: true, password: true, fullName: true, role: true },",
    "select: { id: true, email: true, password: true, fullName: true, role: true, authSource: true },"
)

old_local = """    } else {
      // Локальна авторизація: перевіряємо bcrypt-хеш
      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` });
          return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
      }"""

new_local = """    } else {
      // Локальна авторизація: перевіряємо bcrypt-хеш
      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` });
          return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })
      }
      
      // CWE-xxx: Розділення ідентичностей. LDAP-акаунти не можуть логінитися локально.
      if (user.authSource === 'LDAP') {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `Attempt to locally login into LDAP account ${email}` });
        return NextResponse.json({ error: 'Цей акаунт налаштовано для входу через корпоративну мережу (LDAP).' }, { status: 403 })
      }"""

if old_local in code:
    code = code.replace(old_local, new_local)
    with open("src/app/api/auth/route.ts", "w") as f:
        f.write(code)
    print("Patched authSource local auth check")
else:
    print("Could not find local auth block")
