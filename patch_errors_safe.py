import os
import re

def patch_file(path):
    with open(path, "r") as f:
        content = f.read()

    original = content
    
    # We will find all try-catch blocks and if they have console.error and return NextResponse, we replace their body.
    # A safer regex:
    # catch \( *(error|e|err) *(: *any)? *\) *\{ (.*?return NextResponse\.json.*?\;?\s*) \}
    # But since it can contain nested {}, it's better to manually search for "console.error" and "NextResponse.json("
    # and replace the whole block manually by matching brace counts, OR we can just replace lines.
    
    lines = content.split('\n')
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        match = re.search(r'catch\s*\(\s*(error|e|err|valErr)(?:\s*:\s*any)?\s*\)\s*\{', line)
        if match:
            var_name = match.group(1)
            # Check if the next few lines have console.error and return NextResponse
            lookahead = "\n".join(lines[i:i+15])
            if 'console.error' in lookahead and 'NextResponse.json' in lookahead and ('status: 500' in lookahead or 'status: 400' in lookahead):
                # find the matching closing brace
                brace_count = 0
                started = False
                end_i = i
                for j in range(i, len(lines)):
                    for char in lines[j]:
                        if char == '{':
                            brace_count += 1
                            started = True
                        elif char == '}':
                            brace_count -= 1
                    if started and brace_count == 0:
                        end_i = j
                        break
                
                # Replace lines[i:end_i+1]
                out.append(f"  }} catch ({var_name}: any) {{")
                out.append(f"    return handleApiError({var_name});")
                out.append("  }")
                i = end_i + 1
                continue
        out.append(line)
        i += 1

    new_content = '\n'.join(out)
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

