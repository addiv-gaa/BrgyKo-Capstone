import re

with open('frontend/src/pages/Residents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert header
header_target = r'(<th className="px-6 py-4">Welfare Status</th>)'
header_replacement = r'<th className="px-6 py-4">Voter Status</th>\n                                        \1'
content = re.sub(header_target, header_replacement, content)

# 2. Insert cell
# The row structure has purok, then welfare status, then actions.
# Purok td: <td className="px-6 py-4 font-medium text-gray-900">{resident.purok}</td>
# Welfare td: <td className="px-6 py-4 flex gap-1.5 flex-wrap w-48">
cell_target = r'(<td className="px-6 py-4 font-medium text-gray-900">\{resident\.purok\}</td>\s*)'
cell_replacement = r'''\1<td className="px-6 py-4">
                                                    {resident.is_registered_voter ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">Registered</span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">Not Registered</span>
                                                    )}
                                                </td>
                                                '''
content = re.sub(cell_target, cell_replacement, content)

# 3. Update colSpan
content = content.replace('colSpan={21}', 'colSpan={22}')

with open('frontend/src/pages/Residents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added Voter Status column!")
