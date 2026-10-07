import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

generic_error = "Невірний email або пароль, або акаунт тимчасово заблоковано"

# 1. IP Rate limit - this is fine to reveal, it's about the ATTACKER's IP, not the account.
# 2. Email Rate limit
old_email_limit = """        return NextResponse.json({ error: 'Акаунт тимчасово заблоковано через велику кількість невдалих спроб. Спробуйте через 5 хвилин.' }, { status: 429, headers: { 'Retry-After': '300' } });"""
new_email_limit = f"""        // CWE-204: Generic error to prevent lockout enumeration
        return NextResponse.json({{ error: '{generic_error}' }}, {{ status: 401 }});"""
code = code.replace(old_email_limit, new_email_limit)

# 3. LDAP fallback error
old_ldap_err = "return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 });"
new_ldap_err = f"return NextResponse.json({{ error: '{generic_error}' }}, {{ status: 401 }});"
code = code.replace(old_ldap_err, new_ldap_err)

# 4. Local auth error
old_local_err = "return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })"
new_local_err = f"return NextResponse.json({{ error: '{generic_error}' }}, {{ status: 401 }});"
code = code.replace(old_local_err, new_local_err)

# 5. Missing local account / identity conflict - these also shouldn't be distinct to the attacker!
# Wait, if LDAP succeeded, they are the actual user, so giving them details is fine?
# No, if LDAP succeeded but no local account, they did authenticate with LDAP! So they provided valid creds.
# "Акаунт не знайдено в локальній базі" is fine, because it only happens AFTER successful LDAP bind.
# So attacker can't reach it without knowing the password.

# Replace bcrypt compare error
old_bcrypt_err = "return NextResponse.json({ error: 'Невірний email або пароль' }, { status: 401 })"
new_bcrypt_err = f"return NextResponse.json({{ error: '{generic_error}' }}, {{ status: 401 }});"
code = code.replace(old_bcrypt_err, new_bcrypt_err)

with open("src/app/api/auth/route.ts", "w") as f:
    f.write(code)
print("Patched generic login errors")
