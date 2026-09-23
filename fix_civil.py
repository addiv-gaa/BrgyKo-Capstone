import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

civil_target = r'<span className="bg-blue-100 text-blue-700 px-1\.5 py-1 rounded text-\[10px\] font-bold">S: \{countSingle\.toLocaleString\(\)\}</span>\s*<span className="bg-orange-100 text-orange-700 px-1\.5 py-1 rounded text-\[10px\] font-bold">M: \{countMarried\.toLocaleString\(\)\}</span>\s*<span className="bg-red-100 text-red-700 px-1\.5 py-1 rounded text-\[10px\] font-bold">W: \{countWidowed\.toLocaleString\(\)\}</span>'

civil_replacement = r'''<span className="bg-blue-100 text-blue-700 px-1.5 py-1 rounded text-[10px] font-bold">Single: {countSingle.toLocaleString()}</span>
                                <span className="bg-orange-100 text-orange-700 px-1.5 py-1 rounded text-[10px] font-bold">Married: {countMarried.toLocaleString()}</span>
                                <span className="bg-red-100 text-red-700 px-1.5 py-1 rounded text-[10px] font-bold">Widowed: {countWidowed.toLocaleString()}</span>'''

content = re.sub(civil_target, civil_replacement, content)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Civil Status abbreviations to full words!")
