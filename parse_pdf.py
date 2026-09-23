import pdfplumber
import json
import re

pdf_path = 'C:/Users/hise/.gemini/antigravity/brain/a3696e83-9333-4d06-9550-7a3beb1b1bc6/.user_uploaded/media_1789998765630.pdf'

processes = []

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        table = page.extract_table()
        if not table:
            continue
        
        # Skip header rows
        start_idx = 0
        for r_idx, row in enumerate(table):
            if row[0] and ("Назва процесу L1" in row[0]):
                start_idx = r_idx + 1
                break
        
        for row in table[start_idx:]:
            if len(row) >= 3:
                l1 = (row[0] or "").replace('\n', ' ').strip()
                l2 = (row[1] or "").replace('\n', ' ').strip()
                l3 = (row[2] or "").replace('\n', ' ').strip()
                
                if l1 and l3:
                    processes.append({
                        "l1": l1,
                        "l2": l2,
                        "l3": l3
                    })

# Save to json
with open('processes.json', 'w', encoding='utf-8') as f:
    json.dump(processes, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(processes)} processes.")
