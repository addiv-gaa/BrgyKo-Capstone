import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Recharts axes font sizes
content = re.sub(r'fontSize:\s*10\b', 'fontSize: 12', content)
content = re.sub(r'fontSize:\s*11\b', 'fontSize: 12', content)

# 2. Update Recharts legend font sizes
content = re.sub(r"fontSize:\s*'10px'", "fontSize: '12px'", content)
content = re.sub(r"fontSize:\s*'11px'", "fontSize: '12px'", content)

# 3. Update Chart Titles (h2)
content = content.replace('text-xs font-bold text-gray-800', 'text-sm font-bold text-gray-800')

# 4. Standardize any small custom labels if necessary
# In Gender chart: 
content = content.replace('text-xs">\\n                                    <span className="w-3', 'text-sm">\\n                                    <span className="w-3')

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Standardized all chart fonts to 12px and titles to text-sm!")
