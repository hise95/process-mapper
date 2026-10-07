import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

old_opts = "ldapOpts: { url: process.env.LDAP_URL },"
new_opts = """ldapOpts: { 
            url: process.env.LDAP_URL,
            tlsOptions: { rejectUnauthorized: true } // CWE-295: Enforce strict peer certificate verification for LDAPS
          },"""

code = code.replace(old_opts, new_opts)

with open("src/app/api/auth/route.ts", "w") as f:
    f.write(code)
print("Patched LDAP TLS options")
