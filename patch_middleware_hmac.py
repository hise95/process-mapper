import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

old_ret = "  return hexSignature === providedSig"
new_ret = """  // CWE-208: Constant-time comparison to prevent HMAC timing attacks
  if (hexSignature.length !== providedSig.length) return false;
  let result = 0;
  for (let i = 0; i < hexSignature.length; i++) {
    result |= hexSignature.charCodeAt(i) ^ providedSig.charCodeAt(i);
  }
  return result === 0;"""

code = code.replace(old_ret, new_ret)

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched middleware HMAC comparison")
