import re

# Fix 1: DashboardAdminView HeartHandshake
with open('frontend/src/components/DashboardAdminView.tsx', 'r') as f:
    content = f.read()

content = content.replace('HeartHandIcon', 'HeartHandshake')
with open('frontend/src/components/DashboardAdminView.tsx', 'w') as f:
    f.write(content)

# Fix 2: Residents.tsx clear filter
with open('frontend/src/pages/Residents.tsx', 'r') as f:
    content = f.read()

content = content.replace('is_solo_parent: false\n        })', 'is_solo_parent: false,\n            is_registered_voter: false\n        })')
with open('frontend/src/pages/Residents.tsx', 'w') as f:
    f.write(content)

print("Fixed!")
