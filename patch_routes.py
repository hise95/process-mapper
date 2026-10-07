import os
import re

def patch_file(path):
    with open(path, "r") as f:
        content = f.read()

    # Add import
    if "import { handleApiError }" not in content and "console.error" in content:
        # insert after the first import or at the top
        content = "import { handleApiError } from '@/lib/apiErrorHandler';\n" + content
    
    # We want to replace blocks like:
    # catch (error) {
    #   console.error('Error something:', error)
    #   return NextResponse.json({ error: 'Помилка' }, { status: 500 })
    # }
    # with:
    # catch (error) { return handleApiError(error, 'something'); }

    # Regex to match catch block contents that have console.error and return NextResponse
    # It's tricky. Let's do a simple regex:
    pattern = re.compile(r'catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{[^}]*console\.error\([^,]+,\s*\1\s*\)[^}]*return\s*NextResponse\.json\([^}]+\}[^}]*\}', re.MULTILINE | re.DOTALL)
    
    def repl(m):
        var_name = m.group(1)
        return f"catch ({var_name}: any) {{\n    return handleApiError({var_name});\n  }}"

    new_content = pattern.sub(repl, content)

    # Some might use console.error(..., e)
    pattern2 = re.compile(r'catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{[^}]*console\.error\([^}]*return\s*NextResponse\.json\([^}]+\}[^}]*\}', re.MULTILINE | re.DOTALL)
    
    new_content2 = pattern2.sub(repl, new_content)

    if new_content2 != content:
        with open(path, "w") as f:
            f.write(new_content2)
        print(f"Patched {path}")

api_dir = "src/app/api"
for root, dirs, files in os.walk(api_dir):
    for file in files:
        if file.endswith(".ts"):
            patch_file(os.path.join(root, file))

