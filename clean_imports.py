import os, re

directory = r'c:\VSCode Projects\Capstone Project\frontend\src\pages'

for filename in os.listdir(directory):
    if not filename.endswith('.tsx'):
        continue
    
    path = os.path.join(directory, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Remove PageHeader import
    content = re.sub(r'import\s+PageHeader\s+from\s+[\'"].*?header.*?[\'"];?\s*', '', content)
    # Remove Sidebar import
    content = re.sub(r'import\s+Sidebar\s+from\s+[\'"].*?sidebar.*?[\'"];?\s*', '', content)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
print('Done!')
