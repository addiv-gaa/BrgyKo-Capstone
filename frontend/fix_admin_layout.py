import re

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove imports
    content = re.sub(r'import PageHeader from \"\.\.\/components\/header\";\n', '', content)
    content = re.sub(r'import Sidebar from \"\.\.\/components\/sidebar\";\n', '', content)

    # Fix unauthorized block
    unauth_old = """    if (!isAuthorized && !isLoading) {
        return (
            <div className="h-screen w-full flex flex-col bg-gray-50">
                <PageHeader />
                <div className="flex flex-1">
                    <Sidebar />
                    <main className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc]">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                            <p className="text-gray-500 text-sm">You do not have administrative clearance to view this hub.</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }"""

    unauth_new = """    if (!isAuthorized && !isLoading) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#f8fafc]">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                    <p className="text-gray-500 text-sm">You do not have administrative clearance to view this hub.</p>
                </div>
            </div>
        );
    }"""

    content = content.replace(unauth_old, unauth_new)

    # Fix main return block
    main_old = """    return (
        <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden text-gray-800 font-sans">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f8fafc]">"""

    main_new = """    return (
        <div className="h-full w-full overflow-y-auto p-8 bg-[#f8fafc] text-gray-800 font-sans">"""

    content = content.replace(main_old, main_new)

    # Remove extra closing tags
    content = re.sub(r'\s*</main>\n\s*</div>\n\s*</div>\n\s*\);\n}', '\n        </div>\n    );\n}', content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Success")

if __name__ == '__main__':
    main()
