import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Search to imports
content = content.replace('CalendarIcon, MegaphoneIcon', 'CalendarIcon, MegaphoneIcon, Search')

# 2. Add state variables
state_target = r'const \[loading, setLoading\] = useState\(false\);'
state_replacement = r'''const [loading, setLoading] = useState(false);

    // Filters for sub-table
    const [searchQuery, setSearchQuery] = useState('');
    const [purokFilter, setPurokFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [civilStatusFilter, setCivilStatusFilter] = useState('');'''
content = content.replace(state_target, state_replacement)

# 3. Update query builder in fetchFilteredResidents
query_target = r"if \(activeFilter === 'youth'\) query \+= '&is_youth=true';"
query_replacement = r'''if (activeFilter === 'youth') query += '&is_youth=true';
            
            if (searchQuery) query += &search=;
            if (purokFilter) query += &purok=;
            if (sexFilter) query += &sex=;
            if (civilStatusFilter) query += &civil_status=;'''
content = content.replace(query_target, query_replacement)

# 4. Update dependencies
deps_target = r'\}, \[activeFilter, welfareFilters, page\]\);'
deps_replacement = r'}, [activeFilter, welfareFilters, page, searchQuery, purokFilter, sexFilter, civilStatusFilter]);'
content = content.replace(deps_target, deps_replacement)

# 5. Clear filters when changing activeFilter
handle_click_target = r'setActiveFilter\(filter\);\n\s*setPage\(1\); // reset to page 1 on new filter'
handle_click_replacement = r'''setActiveFilter(filter);
            setPage(1); // reset to page 1 on new filter
            setSearchQuery('');
            setPurokFilter('');
            setSexFilter('');
            setCivilStatusFilter('');'''
content = re.sub(handle_click_target, handle_click_replacement, content)

# 6. Add the UI below the header of the Conditional block
ui_target = r'(<div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">\s*<h3 className="font-bold text-gray-800">Filtered Registry View</h3>\s*<span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Displaying 10 rows</span>\s*</div>)'
ui_replacement = r'''\1
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search residents by name..." 
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    value={purokFilter} 
                                    onChange={e => { setPurokFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Puroks</option>
                                    {stats.charts.purok?.map((p: any) => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <select 
                                    value={sexFilter} 
                                    onChange={e => { setSexFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Sexes</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                <select 
                                    value={civilStatusFilter} 
                                    onChange={e => { setCivilStatusFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>
                    </div>'''
content = re.sub(ui_target, ui_replacement, content)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Filters added to Dashboard sub-table!")
