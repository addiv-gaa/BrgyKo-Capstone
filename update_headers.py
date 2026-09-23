import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject the sum variables
vars_target = r'(const currentYear = new Date\(\)\.getFullYear\(\);)'
vars_replacement = r'''\1

    const totalWelfare = stats.charts.welfare?.reduce((sum: number, item: any) => sum + item.value, 0) || 0;
    const totalVoter = stats.charts.voter?.reduce((sum: number, item: any) => sum + item.value, 0) || 0;
    const totalCivil = stats.charts.civil_status?.reduce((sum: number, item: any) => sum + item.value, 0) || 0;
'''
content = re.sub(vars_target, vars_replacement, content)

# 2. Update Welfare Coverage header
welfare_target = r'<h2 className="text-sm font-bold text-gray-800 mb-4">Welfare Coverage</h2>'
welfare_replacement = r'''<div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-gray-800">Vulnerable Sectors</h2>
                            <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold">
                                Total: {totalWelfare.toLocaleString()}
                            </span>
                        </div>'''
content = content.replace(welfare_target, welfare_replacement)

# 3. Update Voter Status header
voter_target = r'<h2 className="text-sm font-bold text-gray-800 mb-2 text-center">Voter Status</h2>'
voter_replacement = r'''<div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Voter Status</h2>
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                Total: {totalVoter.toLocaleString()}
                            </span>
                        </div>'''
content = content.replace(voter_target, voter_replacement)

# 4. Update Civil Status header
civil_target = r'<h2 className="text-sm font-bold text-gray-800 mb-2 text-center">Civil Status</h2>'
civil_replacement = r'''<div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Civil Status</h2>
                            <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                                Total: {totalCivil.toLocaleString()}
                            </span>
                        </div>'''
content = content.replace(civil_target, civil_replacement)


with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated Headers!")
