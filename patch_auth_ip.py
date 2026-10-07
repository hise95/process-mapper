import sys
import re

with open("src/app/api/auth/route.ts", "r") as f:
    code = f.read()

# Add import
code = code.replace("import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit'", "import { checkRateLimit, clearRateLimit } from '@/lib/rateLimit'\nimport { getClientIp } from '@/lib/ip'")

pattern = re.compile(r"// CWE-345: Insufficient Verification of Data Authenticity[\s\S]*?let ip = req\.headers\.get\('x-real-ip'\);[\s\S]*?ip = 'unknown_ip';\n\s*\}\n\s*\}", re.MULTILINE)

new_code = """// CWE-345 / CWE-307: Безпечне отримання IP без вразливості до підміни X-Forwarded-For
    const ip = getClientIp(req);"""

if pattern.search(code):
    code = pattern.sub(new_code, code)
    with open("src/app/api/auth/route.ts", "w") as f:
        f.write(code)
    print("Patched IP extraction")
else:
    print("Not found")
