import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\ProtectedRoutes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix case-sensitivity in ProtectedRoutes
content = content.replace(
    "const rolesFromToken = decoded.roles || (decoded.role ? [decoded.role] : []);",
    "const rolesFromToken = (decoded.roles || (decoded.role ? [decoded.role] : [])).map(r => r.toUpperCase());"
)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\ProtectedRoutes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
