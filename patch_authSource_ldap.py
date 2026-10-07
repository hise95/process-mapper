import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

old_ldap = """      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP success but local account missing for ${email}` });
        return NextResponse.json({ error: 'Акаунт не знайдено в локальній базі. Зверніться до адміністратора для доступу.' }, { status: 403 })
      }"""

new_ldap = """      if (!user) {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP success but local account missing for ${email}` });
        return NextResponse.json({ error: 'Акаунт не знайдено в локальній базі. Зверніться до адміністратора для доступу.' }, { status: 403 })
      }
      
      // CWE-xxx: Суворе розділення ідентичностей. LOCAL-акаунти не можуть бути захоплені через LDAP.
      if (user.authSource !== 'LDAP') {
        await logSecurityEvent({ action: 'LOGIN_FAILURE', ip, details: `LDAP success but account ${email} is marked as LOCAL` });
        return NextResponse.json({ error: 'Цей акаунт налаштовано тільки для локального входу. Конфлікт ідентичностей.' }, { status: 403 })
      }"""

if old_ldap in code:
    code = code.replace(old_ldap, new_ldap)
    with open("src/app/api/auth/route.ts", "w") as f:
        f.write(code)
    print("Patched authSource LDAP auth check")
else:
    print("Could not find LDAP block")
