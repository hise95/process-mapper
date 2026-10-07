import os
import re

def patch_file(path):
    with open(path, "r") as f:
        content = f.read()

    original = content
    
    # We want to match:
    # catch (error) {
    #   console.error( ... )
    #   return NextResponse.json( ... )
    # }
    
    # We will match from "catch (" to the first "}" after "NextResponse.json"
    pattern = re.compile(r'catch\s*\(\s*(error|e|err|valErr)(?:\s*:\s*any)?\s*\)\s*\{.*?console\.error.*?NextResponse\.json.*?(?:\}\s*\)|})\s*\}', re.MULTILINE | re.DOTALL)
    
    def repl(m):
        var_name = m.group(1)
        return f"catch ({var_name}: any) {{\n    return handleApiError({var_name});\n  }}"

    new_content = pattern.sub(repl, content)

    # Some catch blocks have await logSecurityEvent... let's check manually if this misses anything.
    # Actually, a simpler pattern: match `catch (...) {` until `\n  }` or `\n    }` at the exact same indentation? No.

    # Let's just use re.sub for specific known bodies if regex is too greedy.
    # To prevent greediness, use non-greedy `.*?`
    
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

