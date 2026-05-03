# fix_all_emojis.py — comprehensive mojibake fixer
# Strategy: re-encode latin-1 bytes back to utf-8 for each emoji sequence

import re

def fix_mojibake(text):
    """Fix UTF-8 text that was mis-decoded as Latin-1/Windows-1252."""
    # Pattern matches sequences that look like multi-byte UTF-8 decoded as latin-1
    # These sequences start with Ã, ð, â, Â, etc.
    def try_fix(m):
        s = m.group(0)
        try:
            # Try to re-encode as latin-1 bytes then decode as utf-8
            return s.encode('latin-1').decode('utf-8')
        except Exception:
            return s  # leave unchanged if it doesn't fix

    # Match sequences of high-latin chars that are likely mojibake emoji sequences
    pattern = re.compile(r'[Ã°âÂðÅïÂ¿½][^\x00-\x7F\s\'"<>(){}\[\];,=+\-*&|!?:]{1,8}')
    return pattern.sub(try_fix, text)

files = ['logic.js', 'app.html', 'institution-dashboard.html', 'login.html', 'index.css']

for fname in files:
    try:
        with open(fname, 'r', encoding='utf-8') as f:
            original = f.read()

        fixed = fix_mojibake(original)

        if fixed != original:
            with open(fname, 'w', encoding='utf-8') as f:
                f.write(fixed)
            # Count changes by finding difference
            diff = sum(1 for a, b in zip(original, fixed) if a != b)
            print(f'✅ Fixed {fname} ({len(original) - len(fixed)} chars removed, ~{diff} chars changed)')
        else:
            print(f'⏭  No changes in {fname}')
    except FileNotFoundError:
        print(f'⚠  Skipped {fname} (not found)')
    except Exception as e:
        print(f'❌ Error on {fname}: {e}')

print('Done.')
