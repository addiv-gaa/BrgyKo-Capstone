with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_spectrum = "const SPECTRUM_COLORS = ['#14532d', '#166534', '#15803d', '#16a34a'];"
new_spectrum = "const SPECTRUM_COLORS = ['#16a34a', '#022c22', '#065f46', '#4ade80'];"
content = content.replace(old_spectrum, new_spectrum)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("SPECTRUM_COLORS updated!")
