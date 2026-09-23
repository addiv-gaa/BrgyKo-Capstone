import re

with open('frontend/src/components/ResidentModal.tsx', 'r') as f:
    content = f.read()

# Add to interface
content = re.sub(
    r'(is_4ps_beneficiary:\s*boolean;)',
    r'is_registered_voter: boolean;\n    \1',
    content
)

# Add to DEFAULT_FORM_STATE
content = re.sub(
    r'(is_4ps_beneficiary:\s*false,)',
    r'is_registered_voter: false,\n    \1',
    content
)

# Add Checkbox to Sector / Vulnerability Group section
new_checkbox = '''                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" name="is_registered_voter" checked={formData.is_registered_voter} onChange={handleChange} disabled={isViewOnly} className="w-4 h-4 text-blue-600 rounded" />
                                <span className="text-sm font-medium text-gray-700">Registered Voter</span>
                            </label>
                            {/* FIXED ALL CHECKBOX NAMES */}'''

content = content.replace('{/* FIXED ALL CHECKBOX NAMES */}', new_checkbox)

with open('frontend/src/components/ResidentModal.tsx', 'w') as f:
    f.write(content)

print("Updated ResidentModal successfully!")
