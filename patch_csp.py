import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

import re

# We will replace style-src 'self' 'unsafe-inline' with style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'
old_dev = "`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`"
new_dev = "`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`"

old_prod = "`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`"
new_prod = "`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';`"

code = code.replace(old_dev, new_dev)
code = code.replace(old_prod, new_prod)

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched CSP")
