import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = 'const [loading, setLoading] = useState(false);'
replacement = '''const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [purokFilter, setPurokFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [civilStatusFilter, setCivilStatusFilter] = useState('');'''

# Ensure it's replaced
if target in content:
    content = content.replace(target, replacement, 1) # replace only the first occurrence just in case
else:
    print("TARGET NOT FOUND IN CONTENT")

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed states!")
