import sys

with open("next.config.ts", "r") as f:
    code = f.read()

import re

old_headers = """          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },"""

new_headers = """          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },"""

code = code.replace(old_headers, new_headers)

with open("next.config.ts", "w") as f:
    f.write(code)
print("Patched next.config.ts with DNS prefetch off")
