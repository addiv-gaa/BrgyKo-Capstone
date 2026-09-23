import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace variables
var_target = r'    const totalWelfare = stats\.charts\.welfare\?\.reduce\(\(sum: number, item: any\) => sum \+ item\.value, 0\) \|\| 0;\n    const totalVoter = stats\.charts\.voter\?\.reduce\(\(sum: number, item: any\) => sum \+ item\.value, 0\) \|\| 0;\n    const totalCivil = stats\.charts\.civil_status\?\.reduce\(\(sum: number, item: any\) => sum \+ item\.value, 0\) \|\| 0;'

var_replacement = r'''    const getCount = (arr: any[], name: string) => arr?.find((item: any) => item.name === name)?.value || 0;
    const count4ps = getCount(stats.charts.welfare, '4Ps');
    const countPwd = getCount(stats.charts.welfare, 'PWD');
    const countSolo = getCount(stats.charts.welfare, 'Solo Parent');
    const countSenior = getCount(stats.charts.welfare, 'Senior');
    const countReg = getCount(stats.charts.voter, 'Registered');
    const countUnreg = getCount(stats.charts.voter, 'Not Registered');
    const countSingle = getCount(stats.charts.civil_status, 'Single');
    const countMarried = getCount(stats.charts.civil_status, 'Married');
    const countWidowed = getCount(stats.charts.civil_status, 'Widowed');'''
content = re.sub(var_target, var_replacement, content)

# 2. Replace Welfare Sector header
welfare_target = r'<div className="flex justify-between items-center mb-4">\s*<h2 className="text-sm font-bold text-gray-800">Vulnerable Sectors</h2>\s*<span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold">\s*Total: \{totalWelfare\.toLocaleString\(\)\}\s*</span>\s*</div>'
welfare_replacement = r'''<div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-gray-800">Vulnerable Sectors</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold">4Ps: {count4ps.toLocaleString()}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">PWD: {countPwd.toLocaleString()}</span>
                                <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-[10px] font-bold">Solo: {countSolo.toLocaleString()}</span>
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold">Senior: {countSenior.toLocaleString()}</span>
                            </div>
                        </div>'''
content = re.sub(welfare_target, welfare_replacement, content)

# 3. Replace Voter Status header
voter_target = r'<div className="flex justify-between items-center mb-2">\s*<h2 className="text-sm font-bold text-gray-800">Voter Status</h2>\s*<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">\s*Total: \{totalVoter\.toLocaleString\(\)\}\s*</span>\s*</div>'
voter_replacement = r'''<div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Voter Status</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">Reg: {countReg.toLocaleString()}</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">Unreg: {countUnreg.toLocaleString()}</span>
                            </div>
                        </div>'''
content = re.sub(voter_target, voter_replacement, content)

# 4. Replace Civil Status header
civil_target = r'<div className="flex justify-between items-center mb-2">\s*<h2 className="text-sm font-bold text-gray-800">Civil Status</h2>\s*<span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">\s*Total: \{totalCivil\.toLocaleString\(\)\}\s*</span>\s*</div>'
civil_replacement = r'''<div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Civil Status</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-1 rounded text-[10px] font-bold">S: {countSingle.toLocaleString()}</span>
                                <span className="bg-orange-100 text-orange-700 px-1.5 py-1 rounded text-[10px] font-bold">M: {countMarried.toLocaleString()}</span>
                                <span className="bg-red-100 text-red-700 px-1.5 py-1 rounded text-[10px] font-bold">W: {countWidowed.toLocaleString()}</span>
                            </div>
                        </div>'''
content = re.sub(civil_target, civil_replacement, content)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated badges to individual categories!")
