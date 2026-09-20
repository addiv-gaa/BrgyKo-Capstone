import re

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\GeoMapping.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Imports
    import_old = "import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';"
    import_new = """import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';"""
    content = content.replace(import_old, import_new)

    # 2. States for Filters
    states_old = "    const [searchQuery, setSearchQuery] = useState('');"
    states_new = """    const [searchQuery, setSearchQuery] = useState('');
    const [filterSenior, setFilterSenior] = useState(false);
    const [filterPWD, setFilterPWD] = useState(false);
    const [filter4Ps, setFilter4Ps] = useState(false);
    const [filterSoloParent, setFilterSoloParent] = useState(false);"""
    content = content.replace(states_old, states_new)

    # 3. UseEffect dependency
    effect_old = """    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHouseholds(searchQuery);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);"""
    effect_new = """    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHouseholds(searchQuery);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]); // The map fetching purely relies on text search, client side filtering below"""
    content = content.replace(effect_old, effect_new)

    # 4. Filtered logic
    # Insert right before return (
    filter_logic = """
    const filteredHouseholds = households.filter((h) => {
        if (filterSenior && !h.properties.is_senior_citizen) return false;
        if (filterPWD && !h.properties.is_pwd) return false;
        if (filter4Ps && !h.properties.is_4ps_beneficiary) return false;
        if (filterSoloParent && !h.properties.is_solo_parent) return false;
        return true;
    });

    return ("""
    content = content.replace("    return (", filter_logic)

    # 5. Header and Filters layout
    header_old = """                    <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Geographic Household Mapping</h1>
                            <p className="text-gray-500 text-sm">Interactive household map</p>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <input 
                                type="text"
                                placeholder="Search address or resident name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full lg:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                            />
                            
                            <button 
                                onClick={() => setIsAddMode(!isAddMode)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                                    isAddMode 
                                    ? 'bg-red-50 text-red-600 border border-red-200' 
                                    : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                            >
                                {isAddMode ? 'Cancel Adding Marker' : '+ Add Map Marker'}
                            </button>
                        </div>
                    </div>"""
                    
    header_new = """                    <div className="mb-6 flex flex-col gap-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Geographic Household Mapping</h1>
                                <p className="text-gray-500 text-sm">Interactive household map</p>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <input 
                                    type="text"
                                    placeholder="Search address or resident name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full lg:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                                />
                                
                                <button 
                                    onClick={() => setIsAddMode(!isAddMode)}
                                    className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                                        isAddMode 
                                        ? 'bg-red-50 text-red-600 border border-red-200' 
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                    }`}
                                >
                                    {isAddMode ? 'Cancel Adding Marker' : '+ Add Map Marker'}
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                            <span className="text-sm font-bold text-gray-700 mr-2">Filters:</span>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded pr-3 border border-transparent hover:border-gray-200 transition-colors">
                                <input type="checkbox" checked={filterSenior} onChange={e => setFilterSenior(e.target.checked)} className="rounded text-orange-500 focus:ring-orange-500"/> 
                                Senior Citizens
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded pr-3 border border-transparent hover:border-gray-200 transition-colors">
                                <input type="checkbox" checked={filterPWD} onChange={e => setFilterPWD(e.target.checked)} className="rounded text-blue-500 focus:ring-blue-500"/> 
                                PWD
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded pr-3 border border-transparent hover:border-gray-200 transition-colors">
                                <input type="checkbox" checked={filter4Ps} onChange={e => setFilter4Ps(e.target.checked)} className="rounded text-purple-500 focus:ring-purple-500"/> 
                                4Ps Beneficiary
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1.5 rounded pr-3 border border-transparent hover:border-gray-200 transition-colors">
                                <input type="checkbox" checked={filterSoloParent} onChange={e => setFilterSoloParent(e.target.checked)} className="rounded text-pink-500 focus:ring-pink-500"/> 
                                Solo Parent
                            </label>
                        </div>
                    </div>"""
    content = content.replace(header_old, header_new)

    # 6. Map and Details overlay
    map_details_old = """                    <div className={`relative h-137.5 w-full rounded-xl overflow-hidden shadow-sm border ${isAddMode ? 'border-green-400 cursor-crosshair' : 'border-gray-200'}`}>
                        <MapContainer center={[14.282, 120.952]} zoom={15} className="h-full w-full z-0">
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapClickHandler />
                            
                            {households.map((feature) => {
                                const keyId = feature.id || feature.properties?.id || Math.random();
                                return (
                                    <Marker 
                                        key={keyId}
                                        position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                                        icon={createCustomIcon(feature.properties)}
                                        eventHandlers={{ click: () => setSelectedHousehold(feature) }}
                                    />
                                );
                            })}
                        </MapContainer>
                    </div>

                    {/* DETAILS PANEL */}
                    {selectedHousehold && ("""

    map_details_new = """                    <div className="flex-1 flex overflow-hidden relative rounded-xl shadow-sm border border-gray-200">
                        {/* MAP AREA */}
                        <div className={`flex-1 relative transition-all duration-300 bg-gray-100 ${isAddMode ? 'cursor-crosshair' : ''}`}>
                            <MapContainer center={[14.282, 120.952]} zoom={15} className="h-full w-full z-0 relative">
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MapClickHandler />
                                
                                <MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
                                    {filteredHouseholds.map((feature) => {
                                        const keyId = feature.id || feature.properties?.id || Math.random();
                                        return (
                                            <Marker 
                                                key={keyId}
                                                position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}
                                                icon={createCustomIcon(feature.properties)}
                                                eventHandlers={{ click: () => setSelectedHousehold(feature) }}
                                            />
                                        );
                                    })}
                                </MarkerClusterGroup>
                            </MapContainer>
                            
                            {/* MAP LEGEND */}
                            <div className="absolute bottom-6 left-6 z-[400] bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-gray-200 text-sm">
                                <h4 className="font-bold text-gray-900 mb-3 text-xs uppercase tracking-wider">Map Legend</h4>
                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-700 shadow-sm"></div><span className="text-gray-700 font-medium">PWD Present</span></div>
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-orange-500 border border-orange-700 shadow-sm"></div><span className="text-gray-700 font-medium">Senior Citizen</span></div>
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-pink-500 border border-pink-700 shadow-sm"></div><span className="text-gray-700 font-medium">Solo Parent</span></div>
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-purple-500 border border-purple-700 shadow-sm"></div><span className="text-gray-700 font-medium">4Ps Beneficiary</span></div>
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-700 shadow-sm"></div><span className="text-gray-700 font-medium">Standard</span></div>
                                    <div className="flex items-center gap-3"><div className="w-3.5 h-3.5 rounded-full bg-gray-400 border border-gray-600 shadow-sm"></div><span className="text-gray-700 font-medium">Empty Structure</span></div>
                                </div>
                            </div>
                        </div>

                        {/* SLIDING DETAILS PANEL */}
                        <div className={`absolute top-0 right-0 h-full w-full md:w-[480px] bg-white border-l border-gray-200 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out z-[500] flex flex-col ${selectedHousehold ? 'translate-x-0' : 'translate-x-full'}`}>
                            {selectedHousehold && ("""
                            
    content = content.replace(map_details_old, map_details_new)

    # 7. Modify details panel content to fit sliding drawer
    # Find start of details panel inside `{selectedHousehold && (`
    dp_start = """                        <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up">"""
    dp_start_new = """                        <div className="flex flex-col h-full overflow-hidden">
                                <div className="p-6 shrink-0 border-b border-gray-100 relative">
                                    <button onClick={() => setSelectedHousehold(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>"""
    content = content.replace(dp_start, dp_start_new)

    # 8. Adjust closing div of the old details panel.
    # The old panel closed right before `</main>`
    dp_end = """                            </div>

                        </div>
                    )}
                </main>"""
    dp_end_new = """                            </div>

                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                </main>"""
    content = content.replace(dp_end, dp_end_new)

    # 9. Modify flex layouts inside the panel to handle scrolling.
    # We want the Residents list to be scrollable
    nested_table_old = """                            {/* THE NESTED RESIDENT TABLE */}
                            <div className="mt-6 border-t border-gray-100 pt-6">"""
    nested_table_new = """                            {/* THE NESTED RESIDENT TABLE */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">"""
    content = content.replace(nested_table_old, nested_table_new)

    # 10. Write it back
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Success")

if __name__ == '__main__':
    main()
