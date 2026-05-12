import os

directory = 'c:/xampp/htdocs/Coder'

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            original = content
    except Exception as e:
        return
    
    if filepath.endswith('.json') or filepath.endswith('.js') or filepath.endswith('.html') or filepath.endswith('.md'):
        if 'lock' in filepath or 'backup' in filepath or 'node_modules' in filepath or '.git' in filepath:
            return
            
        content = content.replace('CodeConfidence — Excel from Beginner', 'SkillForge – AI Powered Coding Assessment and Learning Platform for Placements')
        content = content.replace('CodeConfidence — Login', 'SkillForge – Login')
        content = content.replace('CodeConfidence — Institution Dashboard', 'SkillForge – Institution Dashboard')
        content = content.replace('<div class="logo-text">CodeConfidence</div>', '<div class="logo-text" style="display:flex; flex-direction:column; line-height:1.2;"><span>SkillForge</span><span style="font-size:8px; font-weight:normal; color:var(--text-muted); white-space:normal; line-height:1.2; margin-top:2px;">AI Powered Coding Assessment and Learning Platform for Placements</span></div>')
        content = content.replace('<div class="brand-name">CodeConfidence</div>', '<div class="brand-name" style="display:flex; flex-direction:column; align-items:center;"><span>SkillForge</span><span style="font-size:12px; font-weight:normal; color:var(--text-muted); text-align:center; margin-top:8px; max-width: 80%;">AI Powered Coding Assessment and Learning Platform for Placements</span></div>')
        content = content.replace('<div class="sb-name">CodeConfidence</div>', '<div class="sb-name" style="display:flex; flex-direction:column; line-height:1.2;"><span>SkillForge</span><span style="font-size:8px; font-weight:normal; color:white; opacity:0.7; white-space:normal; line-height:1.2; margin-top:2px;">AI Powered Coding Assessment and Learning Platform for Placements</span></div>')
        content = content.replace('CodeConfidence', 'SkillForge')
        content = content.replace('codeconfidence', 'skillforge')
        content = content.replace('CODECONFIDENCE', 'SKILLFORGE')
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Updated: ' + filepath)

for root, dirs, files in os.walk(directory):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for file in files:
        replace_in_file(os.path.join(root, file))
print('Done!')
