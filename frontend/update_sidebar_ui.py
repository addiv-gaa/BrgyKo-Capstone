import re

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if "AuthContext" not in content:
    content = content.replace(
        'import { Link, useLocation } from "react-router-dom";',
        'import { Link, useLocation } from "react-router-dom";\nimport { useContext } from "react";\nimport { AuthContext } from "./AuthContext";'
    )

if "const authContext = useContext(AuthContext);" not in content:
    content = content.replace(
        "export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {",
        "export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {\n    const authContext = useContext(AuthContext);\n    const isAdmin = authContext?.user?.role === 'ADMIN';"
    )

# Find the Admin Hub Link and wrap it
# Usually something like: <Link to="/adminhub" className="...">
# I'll just use a generic regex to wrap the Admin Hub li element.

admin_li_pattern = r'(<li[^>]*>\s*<Link to="/adminhub"[^>]*>[\s\S]*?</li>)'

content = re.sub(admin_li_pattern, r'{isAdmin && (\1)}', content)

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\components\Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
