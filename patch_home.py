import re

with open('frontend/src/pages/Home.tsx', 'r') as f:
    content = f.read()

# Add import if missing
if 'DashboardAdminView' not in content:
    content = content.replace("import StatCard from '../components/StatCard';", "import StatCard from '../components/StatCard';\nimport DashboardAdminView from '../components/DashboardAdminView';")

# Find the block and replace
pattern = r'\{isCaptainOrSecretary && \(\s*<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">.*?</div>\s*\)\}'
replacement = '{isCaptainOrSecretary && <DashboardAdminView />}'

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/src/pages/Home.tsx', 'w') as f:
    f.write(new_content)

print("Updated Home.tsx successfully!")
