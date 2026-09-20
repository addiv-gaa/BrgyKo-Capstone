import re

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\Home.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    start_str = '<div className="divide-y divide-gray-100 flex-1 flex flex-col justify-between">'
    end_str = '<span className="font-bold text-red-600 text-base">911</span>\n                                    </div>\n                                </div>'
    
    start_idx = content.find(start_str)
    end_idx = content.find(end_str)
    
    if start_idx != -1 and end_idx != -1:
        end_idx += len(end_str)
        
        replacement = """<div className="flex-1 overflow-y-auto pr-2 max-h-[420px]">
                                    {emergencyContacts.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No emergency contacts available.</p>
                                    ) : (
                                        emergencyContacts.map((contact: any) => (
                                            <div key={contact.id} className="py-3.5 border-b border-gray-100 last:border-0 last:pb-0 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm uppercase">{contact.name}</p>
                                                    <p className="text-xs text-gray-500">{contact.description}</p>
                                                </div>
                                                <span className="font-semibold text-emerald-600 text-sm ml-4 whitespace-nowrap">{contact.phone}</span>
                                            </div>
                                        ))
                                    )}
                                </div>"""
                                
        content = content[:start_idx] + replacement + content[end_idx:]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success")
    else:
        print("Could not find start or end string.")
        
if __name__ == '__main__':
    main()
