with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# AI Activity (Line & Dot)
content = content.replace('#a855f7', '#166534') # Pine Green

# AI Activity (Area Fill)
content = content.replace('#f3e8ff', '#dcfce7') # Mint Green

# Age Distribution (Bar)
content = content.replace('#8b5cf6', '#15803d') # Kelly Green

# Population by Purok (Bar)
content = content.replace('#f59e0b', '#15803d') # Kelly Green

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Graphs colored!")
