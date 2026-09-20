import re
import sys

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Hotlines Group
    content = re.sub(
        r'\s*\{\/\* Hotlines Group \*\/\}[\s\S]*?(?=\{\/\* Feature Toggles \/ Kill-Switches \*\/})',
        '\n\n                                        ',
        content
    )

    # 2. Permit Requests Toggle
    content = re.sub(
        r'\s*\{\/\* Accept Permit Requests Toggle \*\/\}[\s\S]*?(?=\{\/\* Accept Reservations Toggle \*\/})',
        '\n\n                                                ',
        content
    )

    # 3. Reservations Toggle
    content = re.sub(
        r'\s*\{\/\* Accept Reservations Toggle \*\/\}[\s\S]*?(?=\{\/\* Maintenance Mode Toggle \*\/})',
        '\n\n                                                ',
        content
    )

    # 4. Workflow Limits
    content = re.sub(
        r'\s*\{\/\* Workflow & Policy Limits Group \*\/\}[\s\S]*?(?=<div className="pt-2 flex justify-end">)',
        '\n\n                                        ',
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Done!")

if __name__ == '__main__':
    main()
