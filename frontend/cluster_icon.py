import re

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\GeoMapping.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    cluster_func = """
const createClusterCustomIcon = function (cluster: any) {
    const count = cluster.getChildCount();
    let size = 'h-10 w-10';
    let border = 'border-4 border-emerald-200/50';
    let text = 'text-sm';
    
    if (count > 50) {
        size = 'h-14 w-14';
        border = 'border-[6px] border-emerald-200/50';
        text = 'text-lg';
    } else if (count > 20) {
        size = 'h-12 w-12';
        border = 'border-[5px] border-emerald-200/50';
        text = 'text-base';
    }
    
    return L.divIcon({
        html: `<div class="bg-emerald-600 text-white font-bold ${text} rounded-full ${size} flex items-center justify-center ${border} shadow-lg ring-2 ring-emerald-600 ring-offset-1">${count}</div>`,
        className: 'custom-marker-cluster',
        iconSize: L.point(count > 50 ? 56 : (count > 20 ? 48 : 40), count > 50 ? 56 : (count > 20 ? 48 : 40), true),
    });
};
"""
    content = content.replace('export default function MappingPage', cluster_func + '\nexport default function MappingPage')
    content = content.replace('<MarkerClusterGroup chunkedLoading maxClusterRadius={60}>', '<MarkerClusterGroup chunkedLoading maxClusterRadius={60} iconCreateFunction={createClusterCustomIcon}>')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
if __name__ == '__main__':
    main()
