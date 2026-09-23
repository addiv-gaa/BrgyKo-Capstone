import re

with open('frontend/src/components/ResidentModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the checkbox from Sector / Vulnerability Group
target_checkbox_regex = r'\s*<label className="flex items-center gap-2 cursor-pointer">\s*<input type="checkbox" name="is_registered_voter"[\s\S]*?<span className="text-sm font-medium text-gray-700">Registered Voter</span>\s*</label>'

# Find it and remove it
content = re.sub(target_checkbox_regex, '', content)

# 2. Add it to the Personal Information section
target_personal_info_end = r'(<div className="md:col-span-2">\s*<label className=\{labelClass\}>Birth Date \*\s*</label>\s*<input type="date" name="birth_date" value=\{formData\.birth_date\} onChange=\{handleChange\} required disabled=\{isViewOnly\} className=\{inputClass\} />\s*</div>)'

new_checkbox_html = r'''\1
                            <div className="md:col-span-4 flex items-center pt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="is_registered_voter" checked={formData.is_registered_voter} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-blue-600 rounded" />
                                    <span className="text-sm font-medium text-gray-700">Registered Voter</span>
                                </label>
                            </div>'''

content = re.sub(target_personal_info_end, new_checkbox_html, content)

with open('frontend/src/components/ResidentModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Moved Registered Voter checkbox to Personal Information!")
