import os

file_content = """import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HouseholdModal, { type HouseholdSaveData } from '../components/HouseholdModal';
import AssignResidentModal from '../components/AssignResidentModal';
import ResidentModal, { type ResidentProperties } from '../components/ResidentModal';

const API_URL = import.meta.env.VITE_API_URL;

// --- Types ---
interface ResidentMini {
    id: number;
    first_name: string;
    last_name: string;
    sex: string;
    civil_status: string;
    relationship_to_head: string;
    is_4ps_beneficiary: boolean;
    is_senior_citizen: boolean;
    is_pwd: boolean;
    is_solo_parent: boolean;
}

interface HouseholdProperties {
    id?: number; 
    address: string;
    housing_status: string;
    dwelling_type: string;
    head_of_household: string;
    member_count: number;
    is_4ps_beneficiary: boolean;
    is_senior_citizen: boolean;
    is_pwd: boolean;
    is_solo_parent: boolean;
    residents: ResidentMini[];
}

interface GeoJSONFeature {
    type: "Feature";
    id?: number; 
    geometry: {
        type: "Point";
        coordinates: [number, number]; 
    };
    properties: HouseholdProperties;
}

// --- Marker Styling ---
const getMarkerColor = (props: HouseholdProperties) => {
    if (!props.member_count || props.member_count === 0) return 'bg-gray-400 border-gray-600';
    if (props.is_pwd) return 'bg-blue-500 border-blue-700';
    if (props.is_senior_citizen) return 'bg-orange-500 border-orange-700'; 
    if (props.is_solo_parent) return 'bg-pink-500 border-pink-700';            
    if (props.is_4ps_beneficiary) return 'bg-purple-500 border-purple-700';           
    return 'bg-emerald-500 border-emerald-700';                                          
};

const createCustomIcon = (props: HouseholdProperties) => {
    const colorClasses = getMarkerColor(props);
    return L.divIcon({
        className: 'custom-icon',
        html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-md ${colorClasses}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });
};

export default function MappingPage() {
    const [households, setHouseholds] = useState<GeoJSONFeature[]>([]);
    const [selectedHousehold, setSelectedHousehold] = useState<GeoJSONFeature | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [pendingCoords, setPendingCoords] = useState<{lat: number, lng: number} | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    
    // Filters
    const [filterSenior, setFilterSenior] = useState(false);
    const [filterPWD, setFilterPWD] = useState(false);
    const [filter4Ps, setFilter4Ps] = useState(false);
    const [filterSoloParent, setFilterSoloParent] = useState(false);

    const [isResidentEditOpen, setIsResidentEditOpen] = useState(false);
    const [editingResident, setEditingResident] = useState<ResidentProperties | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchHouseholds = async (query = '') => {
        try {
            const url = query 
                ? `${API_URL}/api/households/?search=${encodeURIComponent(query)}` 
                : `${API_URL}/api/households/`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            
            if (response.ok) {
                const data = await response.json();
                setHouseholds(data.features || []);
                
                if (selectedHousehold) {
                    const updatedSelected = (data.features || []).find(
                        (f: GeoJSONFeature) => f.id === selectedHousehold.id
                    );
                    if (updatedSelected) setSelectedHousehold(updatedSelected);
                }
            }
        } catch (error) {
            console.error("Error fetching map data:", error);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHouseholds(searchQuery);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleEditResidentClick = async (residentId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/residents/${residentId}/`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setEditingResident(data);
                setIsResidentEditOpen(true);
            }
        } catch (error) {
            console.error("Failed to load resident", error);
        }
    };

    const handleSaveResidentInfo = async (formData: Partial<ResidentProperties>) => {
        if (!editingResident) return;
        try {
            const url = `${API_URL}/api/residents/${editingResident.id}/`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });
            if (response.ok) {
                setIsResidentEditOpen(false);
                setEditingResident(null);
                fetchHouseholds(searchQuery); 
            } else {
                alert("Failed to save resident updates.");
            }
        } catch (error) {
            console.error("Failed to save resident", error);
        }
    };

    const handleSaveHousehold = async (formData: Partial<HouseholdSaveData>) => {
        try {
            const method = modalMode === 'edit' ? 'PUT' : 'POST';
            const householdId = selectedHousehold?.id || selectedHousehold?.properties?.id;
            
            const url = modalMode === 'edit' 
                ? `${API_URL}/api/households/${householdId}/` 
                : `${API_URL}/api/households/`;
            
            const payload = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: modalMode === 'add' && pendingCoords
                        ? [pendingCoords.lng, pendingCoords.lat] 
                        : selectedHousehold?.geometry.coordinates
                },
                properties: formData
            };

            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setIsModalOpen(false);
                setPendingCoords(null);
                if (modalMode === 'add') setSelectedHousehold(null);
                fetchHouseholds(searchQuery); 
            } else {
                alert("Failed to save household.");
            }
        } catch (error) {
            console.error("Network error saving household:", error);
        }
    };

    const handleDeleteHousehold = async (id: number) => {
        if (!window.confirm("Delete this physical structure? All residents inside will be marked as unmapped.")) return; 

        try {
            const response = await fetch(`${API_URL}/api/households/${id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok || response.status === 204) {
                setSelectedHousehold(null);
                fetchHouseholds(searchQuery);
            }
        } catch (error) {
            console.error("Network error deleting household:", error);
        }
    };

    const MapClickHandler = () => {
        useMapEvents({
            click: (e) => {
                if (isAddMode) {
                    setPendingCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
                    setModalMode('add');
                    setIsModalOpen(true);
                    setIsAddMode(false);
                }
            }
        });
        return null;
    };

    const filteredHouseholds = households.filter((h) => {
        if (filterSenior && !h.properties.is_senior_citizen) return false;
        if (filterPWD && !h.properties.is_pwd) return false;
        if (filter4Ps && !h.properties.is_4ps_beneficiary) return false;
        if (filterSoloParent && !h.properties.is_solo_parent) return false;
        return true;
    });

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa] flex flex-col">
                    
                    <div className="mb-6 flex flex-col gap-4">
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
                    </div>

                    <div className="flex-1 flex overflow-hidden relative rounded-xl shadow-sm border border-gray-200">
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
                        <div className={`absolute top-0 right-0 h-full w-full md:w-[500px] bg-white border-l border-gray-200 shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transform transition-transform duration-300 ease-in-out z-[500] flex flex-col ${selectedHousehold ? 'translate-x-0' : 'translate-x-full'}`}>
                            {selectedHousehold && (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="p-6 shrink-0 border-b border-gray-100 relative bg-gray-50/50">
                                        <button onClick={() => setSelectedHousehold(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>

                                        <div className="flex justify-between items-start mb-4 pr-8">
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">{selectedHousehold.properties.head_of_household}</h2>
                                                <p className="text-gray-500 text-sm mt-0.5">{selectedHousehold.properties.address}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2">
                                            <button onClick={() => setIsAssignModalOpen(true)} className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-xs font-semibold transition-colors">
                                                + Add Resident
                                            </button>
                                            <button onClick={() => { setModalMode('edit'); setIsModalOpen(true); }} className="px-3 py-1.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold transition-colors">
                                                Edit Structure
                                            </button>
                                            <button onClick={() => {
                                                const idToDelete = selectedHousehold.id || selectedHousehold.properties.id;
                                                if (idToDelete) handleDeleteHousehold(idToDelete as number);
                                            }} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-xs font-semibold transition-colors ml-auto">
                                                Delete
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3 mt-5">
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Members</span>
                                                <span className="text-lg font-bold text-gray-800">{selectedHousehold.properties.member_count}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Structure Info</span>
                                                <span className="text-sm font-semibold text-gray-800 block mt-0.5 truncate" title={selectedHousehold.properties.housing_status}>
                                                    {selectedHousehold.properties.housing_status}
                                                </span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm col-span-2">
                                                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Household Flags</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {selectedHousehold.properties.is_4ps_beneficiary && <span className="bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">4Ps</span>}
                                                    {selectedHousehold.properties.is_senior_citizen && <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Senior</span>}
                                                    {selectedHousehold.properties.is_pwd && <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">PWD</span>}
                                                    {selectedHousehold.properties.is_solo_parent && <span className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Solo Parent</span>}
                                                    {!selectedHousehold.properties.is_4ps_beneficiary && !selectedHousehold.properties.is_senior_citizen && !selectedHousehold.properties.is_pwd && !selectedHousehold.properties.is_solo_parent && (
                                                        <span className="text-[10px] text-gray-400 italic">None recorded</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* THE NESTED RESIDENT TABLE */}
                                    <div className="flex-1 overflow-y-auto p-6">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                            Residents ({selectedHousehold.properties.member_count})
                                        </h3>
                                        
                                        {selectedHousehold.properties.residents && selectedHousehold.properties.residents.length > 0 ? (
                                            <div className="space-y-3">
                                                {selectedHousehold.properties.residents.map(person => (
                                                    <div key={person.id} className="bg-white border border-gray-100 rounded-lg p-3 hover:border-gray-300 transition-colors shadow-sm relative group">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-bold text-gray-900 text-sm">{person.first_name} {person.last_name}</p>
                                                                    {person.relationship_to_head === 'Head' && (
                                                                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-bold uppercase tracking-wider">Head</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-1">{person.sex} • {person.civil_status} • {person.relationship_to_head !== 'Head' ? person.relationship_to_head : 'Household Head'}</p>
                                                            </div>
                                                            <button 
                                                                onClick={() => handleEditResidentClick(person.id)}
                                                                className="p-1.5 border border-gray-200 rounded text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-colors bg-white opacity-0 group-hover:opacity-100" 
                                                                title="Edit Details"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                        </div>
                                                        
                                                        {(person.is_4ps_beneficiary || person.is_senior_citizen || person.is_pwd || person.is_solo_parent) && (
                                                            <div className="flex gap-1.5 flex-wrap mt-3 pt-3 border-t border-gray-50">
                                                                {person.is_4ps_beneficiary && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-200 font-bold uppercase tracking-wider">4Ps</span>}
                                                                {person.is_senior_citizen && <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-200 font-bold uppercase tracking-wider">Senior</span>}
                                                                {person.is_pwd && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase tracking-wider">PWD</span>}
                                                                {person.is_solo_parent && <span className="text-[9px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-200 font-bold uppercase tracking-wider">Solo Parent</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-40">
                                                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                No residents mapped here yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {isModalOpen && (
                <HouseholdModal 
                    mode={modalMode} 
                    household={modalMode === 'edit' ? selectedHousehold : null}
                    coords={pendingCoords}
                    onClose={() => {
                        setIsModalOpen(false);
                        setPendingCoords(null);
                    }}
                    onSave={handleSaveHousehold}
                />
            )}
            {isAssignModalOpen && selectedHousehold && (
                <AssignResidentModal 
                    householdId={selectedHousehold.id || selectedHousehold.properties.id as number}
                    onClose={() => setIsAssignModalOpen(false)}
                    onAssignSuccess={() => {
                        setIsAssignModalOpen(false);
                        fetchHouseholds(searchQuery); 
                    }}
                />
            )}
            {isResidentEditOpen && editingResident && (
                <ResidentModal 
                    mode="edit"
                    resident={editingResident}
                    households={households.map(h => ({
                        id: h.id || h.properties.id || 0,
                        address: h.properties.address || 'Unknown'
                    }))}
                    onClose={() => {
                        setIsResidentEditOpen(false);
                        setEditingResident(null);
                    }}
                    onSave={handleSaveResidentInfo}
                />
            )}
        </div>
    );
}
"""

with open(r'c:\VSCode Projects\Capstone Project\frontend\src\pages\GeoMapping.tsx', 'w', encoding='utf-8') as f:
    f.write(file_content)
    
print("Saved clean file!")
