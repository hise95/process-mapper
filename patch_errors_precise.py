import os
import re

def patch_file(path):
    with open(path, "r") as f:
        content = f.read()

    original = content
    
    # [^{}]+? ensures no nested blocks are matched!
    pattern = re.compile(r'catch\s*\(\s*(error|e|err|valErr)(?:\s*:\s*any)?\s*\)\s*\{[^{}]*?console\.error\([^{}]*?return\s*NextResponse\.json\(\s*\{[^{}]*?\}\s*,\s*\{\s*status:\s*(?:500|400)\s*\}\s*\)[^{}]*?\}')
    
    def repl(m):
        var_name = m.group(1)
        return f"catch ({var_name}: any) {{\n    return handleApiError({var_name});\n  }}"

    new_content = pattern.sub(repl, content)

    if new_content != original:
        if "import { handleApiError }" not in new_content:
            new_content = "import { handleApiError } from '@/lib/apiErrorHandler';\n" + new_content
        with open(path, "w") as f:
            f.write(new_content)
        print(f"Patched {path}")

api_dir = "src/app/api"
for root, dirs, files in os.walk(api_dir):
    for file in files:
        if file.endswith(".ts"):
            patch_file(os.path.join(root, file))

