import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\Residents.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add AuthContext import if not present
if "AuthContext" not in content:
    content = content.replace(
        "import React, { useState, useEffect, useMemo, useRef } from 'react';",
        "import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';\nimport { AuthContext } from '../components/AuthContext';"
    )

# Add user role check inside Residents component
if "const authContext = useContext(AuthContext);" not in content:
    content = content.replace(
        "export default function Residents() {",
        "export default function Residents() {\n    const authContext = useContext(AuthContext);\n    const isCaptain = authContext?.user?.role === 'CAPTAIN';"
    )

# Hide add button
content = content.replace(
    '<button onClick={() => { setModalMode(\'add\'); setSelectedResident(null); setIsModalOpen(true); }} className="bg-[#15803d] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors flex items-center gap-2 shadow-sm">\n                                <span>+ Add Resident</span>\n                            </button>',
    '{!isCaptain && (<button onClick={() => { setModalMode(\'add\'); setSelectedResident(null); setIsModalOpen(true); }} className="bg-[#15803d] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors flex items-center gap-2 shadow-sm">\n                                <span>+ Add Resident</span>\n                            </button>)}'
)

# Hide edit and delete buttons in the table
# The buttons are: 
# <button onClick={() => { setModalMode('edit'); setSelectedResident(resident as ResidentProperties); setIsModalOpen(true); }} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-2 rounded-lg transition-colors" title="Edit Resident">...</button>
# <button onClick={() => handleDeleteResident(resident.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg transition-colors" title="Delete Resident">...</button>

content = re.sub(
    r'(<button onClick=\{\(\) => \{ setModalMode\(\'edit\'\); [^<]+</button>)',
    r'{!isCaptain && (\1)}',
    content
)

content = re.sub(
    r'(<button onClick=\{\(\) => handleDeleteResident\(resident.id\)\} [^<]+</button>)',
    r'{!isCaptain && (\1)}',
    content
)

# Hide Bulk Delete button
content = re.sub(
    r'(<button\s+onClick=\{handleBulkDelete\}\s+[^<]+</button>)',
    r'{!isCaptain && (\1)}',
    content
)


with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\Residents.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
