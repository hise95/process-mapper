import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

old_log = "console.warn('LDAP auth failed for', email, ':', error?.message);"
new_log = """// CWE-209: Sanitize LDAP error to prevent internal directory information disclosure in server logs
        console.warn('LDAP auth failed for', email, '(Details omitted for security)');"""

code = code.replace(old_log, new_log)

with open("src/app/api/auth/route.ts", "w") as f:
    f.write(code)
print("Patched LDAP error logging")
