import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r"const STAFF_ROLES = \[\n\s+\{ value: 'TREASURER', label: 'Treasurer' \},\n\s+\{ value: 'COUNCIL', label: 'Barangay Council' \},\n\s+\{ value: 'SK', label: 'SK' \},\n\s+\{ value: 'TANOD', label: 'Tanod' \},\n\s+\];",
    "const STAFF_ROLES = [\n        { value: 'ADMIN', label: 'Admin' },\n        { value: 'STAFF', label: 'Staff' },\n        { value: 'CAPTAIN', label: 'Captain' },\n    ];",
    content
)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
