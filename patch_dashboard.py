import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            if (activeFilter === 'vulnerable') {
                if (welfareFilters.pwd) query += '&is_pwd=True';
                if (welfareFilters.senior) query += '&is_senior_citizen=True';
                if (welfareFilters.solo) query += '&is_solo_parent=True';
                if (welfareFilters.fourps) query += '&is_4ps_beneficiary=True';
            }'''

replacement = '''            if (activeFilter === 'vulnerable') {
                const noWelfareChecked = !welfareFilters.pwd && !welfareFilters.senior && !welfareFilters.solo && !welfareFilters.fourps;
                if (noWelfareChecked) {
                    setResidents([]);
                    setTotalPages(1);
                    setLoading(false);
                    return; // Short-circuit, no one selected
                }
                
                if (welfareFilters.pwd) query += '&is_pwd=True';
                if (welfareFilters.senior) query += '&is_senior_citizen=True';
                if (welfareFilters.solo) query += '&is_solo_parent=True';
                if (welfareFilters.fourps) query += '&is_4ps_beneficiary=True';
            }'''

if target in content:
    content = content.replace(target, replacement)
    with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Frontend patched!")
else:
    print("Target not found.")
