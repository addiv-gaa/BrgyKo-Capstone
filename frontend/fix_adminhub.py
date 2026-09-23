import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "if (userRole === 'CAPTAIN' || userRole === 'SECRETARY') {",
    "if (userRole === 'ADMIN') {"
)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
