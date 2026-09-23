import os

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

new_stat_card = """const THEMES: Record<string, any> = {
    green: {
        wrapperHover: 'hover:border-green-300 hover:shadow-md',
        wrapperActive: 'border-green-400 shadow-md ring-1 ring-green-400 bg-green-50/10',
        icon: 'bg-green-50 text-green-600',
    },
    teal: {
        wrapperHover: 'hover:border-teal-300 hover:shadow-md',
        wrapperActive: 'border-teal-400 shadow-md ring-1 ring-teal-400 bg-teal-50/10',
        icon: 'bg-teal-50 text-teal-600',
    },
    blue: {
        wrapperHover: 'hover:border-blue-300 hover:shadow-md',
        wrapperActive: 'border-blue-400 shadow-md ring-1 ring-blue-400 bg-blue-50/10',
        icon: 'bg-blue-50 text-blue-600',
    },
    orange: {
        wrapperHover: 'hover:border-orange-300 hover:shadow-md',
        wrapperActive: 'border-orange-400 shadow-md ring-1 ring-orange-400 bg-orange-50/10',
        icon: 'bg-orange-50 text-orange-600',
    }
};

// Reusable Stat Card - Matched to Resident View styling
const StatCard = ({ title, value, icon, active, onClick, colorKey }: any) => {
    const theme = THEMES[colorKey] || THEMES.blue;
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-4 p-6 rounded-xl shadow-sm border transition-all group ${
                active 
                    ? theme.wrapperActive 
                    : `bg-white border-gray-200 ${theme.wrapperHover}`
            }`}
        >
            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${theme.icon}`}>
                {icon}
            </div>
            <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-2xl font-semibold text-gray-700 mt-1">{value}</p>
            </div>
        </button>
    );
};"""

# Replace the old StatCard
pattern = r'// Reusable Stat Card.*?</button>\n\);'
content = re.sub(pattern, new_stat_card, content, flags=re.DOTALL)

# Update the calls to StatCard to include colorKey
content = content.replace(
    'onClick={() => handleFilterClick(\'total\')}',
    'onClick={() => handleFilterClick(\'total\')}\n                    colorKey="green"'
)
content = content.replace(
    'onClick={() => handleFilterClick(\'vulnerable\')}',
    'onClick={() => handleFilterClick(\'vulnerable\')}\n                    colorKey="teal"'
)
content = content.replace(
    'onClick={() => handleFilterClick(\'voters\')}',
    'onClick={() => handleFilterClick(\'voters\')}\n                    colorKey="blue"'
)
content = content.replace(
    'onClick={() => handleFilterClick(\'youth\')}',
    'onClick={() => handleFilterClick(\'youth\')}\n                    colorKey="orange"'
)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated StatCard styling!")
