import sys

with open("src/middleware.ts", "r") as f:
    code = f.read()

# Replace img-src 'self' data: blob: https:; with img-src 'self' data: blob:;
code = code.replace("img-src 'self' data: blob: https:;", "img-src 'self' data: blob:;")

with open("src/middleware.ts", "w") as f:
    f.write(code)
print("Patched CSP img-src")
