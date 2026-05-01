import re
with open('logic.js', 'r', encoding='utf-8') as f:
    text = f.read()
text = re.sub(r'launchTechnicalInterview\([^)]+\)', "launchMockInterview('technical')", text)
text = re.sub(r'launchBehavioralPrep\([^)]+\)', "launchMockInterview('behavioral')", text)
with open('logic.js', 'w', encoding='utf-8') as f:
    f.write(text)
