import re

def selectively_fix_mojibake(filepath):
    print(f"Fixing {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Grab all mojibake patterns
    matches = set(re.findall(r'ðŸ[^\s"\'<>{}]*', content))
    m2 = set(re.findall(r'â[^\s"\'<>{}]*', content))
    all_bad = list(matches) + list(m2)
    
    replacements = {}
    for bad in all_bad:
        try:
            # Reverse the double encoding
            good = bad.encode('cp1252').decode('utf-8')
            replacements[bad] = good
        except Exception as e:
            # If it fails, it's either an already good char mixed in or unfixable via cp1252
            pass
            
    # Some manual fixes if cp1252 decode wasn't perfect due to trailing characters captured
    replacements['ðŸ  '] = '🏠'
    replacements['ðŸ—ºï¸'] = '🗺️'
    
    for bad, good in sorted(replacements.items(), key=lambda x: len(x[0]), reverse=True):
        if good and good != bad:
            # print(f"Replacing {repr(bad)} with {good}")
            content = content.replace(bad, good)
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done!")

selectively_fix_mojibake('logic.js')
selectively_fix_mojibake('app.html')
