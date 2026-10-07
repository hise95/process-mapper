import re

for filepath in [
    "src/app/api/auth/route.ts",
    "src/app/api/users/route.ts"
]:
    with open(filepath, "r") as f:
        code = f.read()

    # Replace all: { action: '...', ip, details: `...` }
    # Pattern: details: `...` or details: '...'
    # We just drop the details key from logSecurityEvent calls and replace with meta: { reason: ... }

    # First, map each known details string to a meta.reason
    replacements = [
        # auth/route.ts patterns
        ("{ action: 'LOGIN_FAILURE', ip, details: `LDAP failure for ${email}` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'LDAP_FAILURE', authMethod: 'LDAP' } }"),
        ("{ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email} (LDAP enforced)` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'LDAP_ENFORCED' } }"),
        ("{ action: 'LOGIN_FAILURE', ip, details: `LDAP success but local account missing for ${email}` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'MISSING_LOCAL_ACCOUNT' } }"),
        ("{ action: 'LOGIN_FAILURE', ip, details: `LDAP success but account ${email} is marked as LOCAL` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'IDENTITY_CONFLICT' } }"),
        ("{ action: 'LOGIN_FAILURE', ip, details: `Invalid credentials for ${email}` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'INVALID_CREDENTIALS' } }"),
        ("{ action: 'LOGIN_FAILURE', ip, details: `Attempt to locally login into LDAP account ${email}` }",
         "{ action: 'LOGIN_FAILURE', ip, meta: { reason: 'IDENTITY_CONFLICT' } }"),
        ("{ action: 'LOGIN_SUCCESS', userId: user!.id, ip, details: `User logged in` }",
         "{ action: 'LOGIN_SUCCESS', userId: user!.id, ip }"),
        ("{ action: 'SESSION_ISSUANCE', userId: user!.id, ip, details: `Session issued via POST /api/auth` }",
         "{ action: 'SESSION_ISSUANCE', userId: user!.id, ip }"),
        # users/route.ts patterns
        ("{ action: 'USER_CREATE', userId: session.id, targetId: user.id, details: `Created user ${email} with role ${role}` }",
         "{ action: 'USER_CREATE', userId: session.id, targetId: user.id, meta: { newRole: role } }"),
        ("{ action: 'ROLE_CHANGE', userId: session.id, targetId: userId, details: `Role changed to ${role}` }",
         "{ action: 'ROLE_CHANGE', userId: session.id, targetId: userId, meta: { newRole: role } }"),
        ("{ action: 'PASSWORD_RESET', userId: session.id, targetId: userId, details: `Password was reset/changed` }",
         "{ action: 'PASSWORD_RESET', userId: session.id, targetId: userId }"),
        ("{ action: 'USER_DELETE', userId: session.id, targetId: userId, details: `User deleted` }",
         "{ action: 'USER_DELETE', userId: session.id, targetId: userId }"),
    ]

    for old, new in replacements:
        code = code.replace(old, new)

    with open(filepath, "w") as f:
        f.write(code)

print("Patched audit callers")
