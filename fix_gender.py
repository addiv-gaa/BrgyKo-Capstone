import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('className="flex items-center gap-2 text-xs"', 'className="flex items-center gap-2 text-sm"')

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
