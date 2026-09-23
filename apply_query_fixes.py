with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix query builder
old_query = "if (activeFilter === 'youth') query += '&is_youth=true';"
new_query = '''if (activeFilter === 'youth') query += '&is_youth=true';
            
            if (searchQuery) query += &search=;
            if (purokFilter) query += &purok=;
            if (sexFilter) query += &sex=;
            if (civilStatusFilter) query += &civil_status=;'''
content = content.replace(old_query, new_query)

# Fix dependencies
old_deps = "}, [activeFilter, welfareFilters, page]);"
new_deps = "}, [activeFilter, welfareFilters, page, searchQuery, purokFilter, sexFilter, civilStatusFilter]);"
content = content.replace(old_deps, new_deps)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated query parameters and useEffect dependencies!")
