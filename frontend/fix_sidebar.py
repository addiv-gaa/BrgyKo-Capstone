import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Filter out Admin Hub if not ADMIN
# Find where staffAdministration is rendered:
# {menuItems.staffAdministration.map((item, index) => (
# Replace with:
# {menuItems.staffAdministration.filter(item => isAdmin || item.label !== "Admin Hub").map((item, index) => (

content = content.replace(
    "{menuItems.staffAdministration.map((item, index) => (",
    "{menuItems.staffAdministration.filter(item => isAdmin || item.label !== 'Admin Hub').map((item, index) => ("
)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
