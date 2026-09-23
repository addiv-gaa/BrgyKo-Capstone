import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Gender Population Zero bug
content = content.replace("=== 'M')", "=== 'Male')")
content = content.replace("=== 'F')", "=== 'Female')")

# 2. Fix Purok Label Cut-off
# Original margin: margin={{ top: 0, right: 10, left: -20, bottom: 0 }}
# Original width: width={60}
# But I must be careful to target the Purok one specifically.
pattern_purok = r'(Population by Purok.*?margin=\{\{\s*top:\s*0,\s*right:\s*10,\s*left:\s*)-20(,\s*bottom:\s*0\s*\}\}.*?YAxis type="category" dataKey="name" axisLine=\{false\} tickLine=\{false\} tick=\{\{ fontSize: 12, fill: \'#6b7280\' \}\} width=\{)60(\})'

# Instead of complex regex, let's just find the exact block for Purok.
old_purok = "margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>\n                                    <CartesianGrid strokeDasharray=\"3 3\" horizontal={false} stroke=\"#f3f4f6\" />\n                                    <XAxis type=\"number\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />\n                                    <YAxis type=\"category\" dataKey=\"name\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={60} />"
new_purok = "margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>\n                                    <CartesianGrid strokeDasharray=\"3 3\" horizontal={false} stroke=\"#f3f4f6\" />\n                                    <XAxis type=\"number\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />\n                                    <YAxis type=\"category\" dataKey=\"name\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={80} />"

content = content.replace(old_purok, new_purok)

# Let's also ensure Age distribution doesn't get cut off if it had negative margins.
# Wait, Age Distribution has left: 0 and width: 80. Let's make sure it's wide enough for "15-30 (Youth)" which is long.
# Let's change width={80} to width={95} for Age Distribution.
old_age = "margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>\n                                    <CartesianGrid strokeDasharray=\"3 3\" horizontal={false} stroke=\"#f3f4f6\" />\n                                    <XAxis type=\"number\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />\n                                    <YAxis type=\"category\" dataKey=\"name\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={80} />"
new_age = "margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>\n                                    <CartesianGrid strokeDasharray=\"3 3\" horizontal={false} stroke=\"#f3f4f6\" />\n                                    <XAxis type=\"number\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />\n                                    <YAxis type=\"category\" dataKey=\"name\" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={95} />"

content = content.replace(old_age, new_age)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed Gender count logic and Purok/Age axis margins/widths!")
