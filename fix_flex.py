import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace flex flex-col and h-48 flex-1
content = content.replace('bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col', 'bg-white p-4 rounded-xl shadow-sm border border-gray-200')
content = content.replace('h-48 flex-1', 'h-56')

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed flex-1 squishing on Row 2 charts!")
