import sys

with open("src/components/wiki/RichTextEditor.tsx", "r") as f:
    code = f.read()

import re

# We need to change content parsing to support JSON, and onUpdate to export JSON
old_content = "content,"
new_content = "content: (content && (content.trim().startsWith('{') || content.trim().startsWith('['))) ? JSON.parse(content) : content,"

code = code.replace("    content,", f"    {new_content}")

old_onupdate = """    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },"""

new_onupdate = """    onUpdate: ({ editor }) => {
      // CWE-79: Зберігаємо JSON AST замість сирого HTML
      onChange(JSON.stringify(editor.getJSON()));
    },"""

code = code.replace(old_onupdate, new_onupdate)

with open("src/components/wiki/RichTextEditor.tsx", "w") as f:
    f.write(code)
print("Patched RichTextEditor")
