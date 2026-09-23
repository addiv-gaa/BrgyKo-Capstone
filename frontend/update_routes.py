import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update staffRoles
content = re.sub(r"const staffRoles = \['CAPTAIN', 'SECRETARY', 'TREASURER', 'COUNCIL', 'SK', 'TANOD'\];", 
                 r"const staffRoles = ['CAPTAIN', 'ADMIN', 'STAFF'];", content)

# General mapping for old roles arrays
content = content.replace("['SECRETARY', 'CAPTAIN']", "['STAFF', 'ADMIN', 'CAPTAIN']")
content = content.replace("['SECRETARY', 'CAPTAIN', 'TANOD']", "['STAFF', 'ADMIN', 'CAPTAIN']")
content = content.replace("['TANOD', 'SECRETARY', 'CAPTAIN']", "['STAFF', 'ADMIN', 'CAPTAIN']")
content = content.replace("['RESIDENT', 'TANOD', 'SECRETARY', 'CAPTAIN']", "['RESIDENT', 'STAFF', 'ADMIN', 'CAPTAIN']")

# Fix AdminHub to ONLY be ADMIN
content = re.sub(r'(path="/adminhub"\s*element={<ProtectedRoute allowedRoles={)\[' + r"'STAFF', 'ADMIN', 'CAPTAIN'" + r'\]', 
                 r"\1['ADMIN']", content)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
