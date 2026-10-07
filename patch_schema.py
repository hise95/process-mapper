import sys

with open("src/lib/schemas.ts", "r") as f:
    code = f.read()

import re

old_wiki_content = "content: z.string().max(100000, 'Контент занадто великий').optional().nullable().transform(val => val ? sanitizeHtml(val, sanitizeHtmlOptions) : val),"
new_wiki_content = "content: z.string().max(100000, 'Контент занадто великий').optional().nullable(),"

code = code.replace(old_wiki_content, new_wiki_content)

with open("src/lib/schemas.ts", "w") as f:
    f.write(code)
print("Patched schemas.ts")
