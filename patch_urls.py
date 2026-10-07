import sys

with open("src/lib/schemas.ts", "r") as f:
    code = f.read()

import re

# We will create a shared safeUrl type
if "const safeUrl" not in code:
    code = code.replace("export const kpiSchema", "const safeUrl = z.string().url('Некоректний формат URL').regex(/^https?:\\/\\//i, 'Дозволені лише HTTP/HTTPS посилання').max(1000).optional().nullable();\n\nexport const kpiSchema")

# Replace docUrl
code = code.replace("docUrl: z.string().max(1000).optional().nullable(),", "docUrl: safeUrl, // CWE-79: Strict URL validation to prevent javascript: XSS")
# Replace bpmnUrl
code = code.replace("bpmnUrl: z.string().max(1000).optional().nullable(),", "bpmnUrl: safeUrl, // CWE-79: Strict URL validation")

with open("src/lib/schemas.ts", "w") as f:
    f.write(code)
print("Patched schemas.ts for URLs")
