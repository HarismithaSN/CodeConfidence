with open('logic.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()
import re
for i, line in enumerate(lines):
    if i < 3000: continue
    m = re.search(r'(?:async\s+)?function\s+([a-zA-Z0-9_]+)', line)
    if m:
        print(f"{i+1}: {m.group(1)}")
