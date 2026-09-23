with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_query1 = "if (searchQuery) query += &search=;"
good_query1 = "if (searchQuery) query += '&search=' + encodeURIComponent(searchQuery);"
content = content.replace(bad_query1, good_query1)

bad_query2 = "if (purokFilter) query += &purok=;"
good_query2 = "if (purokFilter) query += '&purok=' + encodeURIComponent(purokFilter);"
content = content.replace(bad_query2, good_query2)

bad_query3 = "if (sexFilter) query += &sex=;"
good_query3 = "if (sexFilter) query += '&sex=' + encodeURIComponent(sexFilter);"
content = content.replace(bad_query3, good_query3)

bad_query4 = "if (civilStatusFilter) query += &civil_status=;"
good_query4 = "if (civilStatusFilter) query += '&civil_status=' + encodeURIComponent(civilStatusFilter);"
content = content.replace(bad_query4, good_query4)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed query string interpolation bug!")
