import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Arrays
colors_target = r"const COLORS = \['#1e7b2b', '#14b8a6', '#ef4444', '#f59e0b', '#3b82f6'\];\n\s*const GENDER_COLORS = \['#1d4ed8', '#ea580c'\]; // Male, Female"
colors_replacement = r"const BINARY_COLORS = ['#14532d', '#16a34a'];\n    const SPECTRUM_COLORS = ['#14532d', '#166534', '#15803d', '#16a34a'];"
content = re.sub(colors_target, colors_replacement, content)

# 2. Gender Chart Cells
gender_cell_target = r"GENDER_COLORS\[index % GENDER_COLORS\.length\]"
gender_cell_replacement = r"BINARY_COLORS[index % BINARY_COLORS.length]"
content = re.sub(gender_cell_target, gender_cell_replacement, content)

# 3. Gender Label Dots
content = content.replace('bg-[#1d4ed8]', 'bg-[#14532d]')
content = content.replace('bg-[#ea580c]', 'bg-[#16a34a]')

# 4. AI Activity
ai_target = r"<Area type=\"monotone\" dataKey=\"ai\" stroke=\"#a855f7\" fill=\"#f3e8ff\" strokeWidth=\{3\} activeDot=\{\{ r: 6, fill: '#a855f7', strokeWidth: 0 \}\} />"
ai_replacement = r"<Area type=\"monotone\" dataKey=\"ai\" stroke=\"#166534\" fill=\"#dcfce7\" strokeWidth={3} activeDot={{ r: 6, fill: '#166534', strokeWidth: 0 }} />"
content = content.replace(ai_target, ai_replacement)

# 5. Age Distribution
age_target = r"<Bar dataKey=\"value\" fill=\"#8b5cf6\" radius=\{\[0, 4, 4, 0\]\} barSize=\{16\} />"
age_replacement = r"<Bar dataKey=\"value\" fill=\"#15803d\" radius={[0, 4, 4, 0]} barSize={16} />"
content = content.replace(age_target, age_replacement)

# 6. Voter Status
voter_target = r"fill=\{COLORS\[index % COLORS\.length\]\}"
voter_replacement = r"fill={BINARY_COLORS[index % BINARY_COLORS.length]}"
content = re.sub(voter_target, voter_replacement, content)

# 7. Purok
purok_target = r"<Bar dataKey=\"value\" fill=\"#f59e0b\" radius=\{\[0, 4, 4, 0\]\} barSize=\{16\} />"
purok_replacement = r"<Bar dataKey=\"value\" fill=\"#15803d\" radius={[0, 4, 4, 0]} barSize={16} />"
content = content.replace(purok_target, purok_replacement)

# 8. Civil Status
civil_target = r"fill=\{COLORS\[\(index\+2\) % COLORS\.length\]\}"
civil_replacement = r"fill={SPECTRUM_COLORS[index % SPECTRUM_COLORS.length]}"
content = re.sub(civil_target, civil_replacement, content)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Colors successfully updated!")
