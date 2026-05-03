import re

def extract(filepath):
    print(f"Extracting for {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    matches = set(re.findall(r'ðŸ[^\s"\'<>]{0,4}', content))
    m2 = set(re.findall(r'â[^\s"\'<>]{0,4}', content))
    print(list(matches) + list(m2))

extract('logic.js')
extract('app.html')
