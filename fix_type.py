import re

with open('frontend/src/pages/Residents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = r'(purok: string;)'
replacement = r'\1\n    is_registered_voter: boolean;'
content = re.sub(target, replacement, content)

with open('frontend/src/pages/Residents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed ResidentData type!")
