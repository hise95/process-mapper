import sys

with open("src/components/wiki/WikiContent.tsx", "r") as f:
    code = f.read()

import re

old_dompurify = """                    __html: DOMPurify.sanitize(activeSection.content, {
                      ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','a','br','div','span','code','pre','blockquote','table','thead','tbody','tr','th','td'],
                      ALLOWED_ATTR: ['href','class','target','rel'],
                      ALLOW_DATA_ATTR: false,
                    })"""

new_dompurify = """                    __html: DOMPurify.sanitize(activeSection.content, {
                      ALLOWED_TAGS: ['h1','h2','h3','h4','p','ul','ol','li','strong','em','a','br','div','span','code','pre','blockquote','table','thead','tbody','tr','th','td', 'img'],
                      ALLOWED_ATTR: ['href','class','target','rel','src','alt','title','width','height'],
                      ALLOW_DATA_ATTR: false,
                    })"""

if old_dompurify in code:
    code = code.replace(old_dompurify, new_dompurify)
    with open("src/components/wiki/WikiContent.tsx", "w") as f:
        f.write(code)
    print("Patched frontend DOMPurify")
else:
    print("Could not find frontend DOMPurify config")

