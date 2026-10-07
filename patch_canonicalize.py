import sys

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

import re

# In auth/route.ts
old_auth = "const { email, password } = await req.json()"
new_auth = """const body = await req.json();
    let email = body.email;
    if (email) email = email.trim().toLowerCase(); // CWE-178: Canonicalize email
    const password = body.password;"""
code = code.replace(old_auth, new_auth)
code = code.replace("email.toLowerCase()", "email") # Since it's already lowercased

with open("src/app/api/auth/route.ts", "w") as f:
    f.write(code)

with open("src/app/api/users/route.ts", "r") as f:
    code = f.read()

# In users/route.ts POST
old_post = "const { email, password, fullName, role, currentPassword } = await req.json()"
new_post = """const body = await req.json();
  let { email, password, fullName, role, currentPassword } = body;
  if (email) email = email.trim().toLowerCase(); // CWE-178"""
code = code.replace(old_post, new_post)

# In users/route.ts PATCH
old_patch = "const { userId, role, password, email, fullName, currentPassword } = await req.json()"
new_patch = """const bodyPatch = await req.json();
  let { userId, role, password, email, fullName, currentPassword } = bodyPatch;
  if (email) email = email.trim().toLowerCase(); // CWE-178"""
code = code.replace(old_patch, new_patch)

with open("src/app/api/users/route.ts", "w") as f:
    f.write(code)

print("Patched canonicalization")
