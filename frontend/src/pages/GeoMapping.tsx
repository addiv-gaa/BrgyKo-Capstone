import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HouseholdModal, { type HouseholdSaveData } from '../components/HouseholdModal';
import Sidebar from '../components/sidebar';
import PageHeader from '../components/header';
import AssignResidentModal from '../components/AssignResidentModal';

const API_URL = import.meta.env.VITE_API_URL;

// --- Types ---
// Notice how this matches the exact JSON output of your DRF Serializer!
interface ResidentMini {
    id: number;
    first_name: string;
    last_name: string;
    sex: string;
    civil_status: string;
    relationship_to_head: string;
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
}

interface HouseholdProperties {
    id?: number; 
    address: string;
    housing_status: string;
    dwelling_type: string;
    
    // Dynamically calculated by Django
    head_of_household: string;
    member_count: number;
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
    has_pwd: boolean;
    has_solo_parent: boolean;
    
    // Nested data
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
    if (props.has_senior_citizen || props.has_pwd) return 'bg-red-500 border-red-700'; 
    if (props.is_4ps_beneficiary) return 'bg-green-500 border-green-700';           
    if (props.has_solo_parent) return 'bg-yellow-500 border-yellow-700';            
    return 'bg-blue-600 border-blue-800';                                           
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
                
                // If a household is currently selected, refresh its nested data too
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

    const handleSaveHousehold = async (formData: Partial<HouseholdSaveData>) => {
        try {
            const method = modalMode === 'edit' ? 'PUT' : 'POST';
            const householdId = selectedHousehold?.id || selectedHousehold?.properties?.id;
            
            const url = modalMode === 'edit' 
                ? `${API_URL}/api/households/${householdId}/` 
                : `${API_URL}/api/households/`;
            
            // We only send physical data, the backend handles the rest!
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

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
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
                                className="w-full lg:w-64 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                            
                            <button 
                                onClick={() => setIsAddMode(!isAddMode)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors ${
                                    isAddMode 
                                    ? 'bg-red-50 text-red-600 border border-red-200' 
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                            >
                                {isAddMode ? 'Cancel Adding Marker' : '+ Add Map Marker'}
                            </button>
                        </div>
                    </div>

                    <div className={`relative h-137.5 w-full rounded-xl overflow-hidden shadow-sm border ${isAddMode ? 'border-blue-400 cursor-crosshair' : 'border-gray-200'}`}>
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
                    {selectedHousehold && (
                        <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedHousehold.properties.head_of_household}</h2>
                                    <p className="text-gray-500">{selectedHousehold.properties.address}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    {/* Link to Resident creation later if needed */}
                                    <button
                                        onClick={() => setIsAssignModalOpen(true)}
                                        className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium transition-colors">
                                        + Add Resident Here
                                    </button>

                                    <button 
                                        onClick={() => {
                                            setModalMode('edit');
                                            setIsModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Edit Structure
                                    </button>
                                    
                                    <button 
                                        onClick={() => {
                                            const idToDelete = selectedHousehold.id || selectedHousehold.properties.id;
                                            if (idToDelete) handleDeleteHousehold(idToDelete as number);
                                        }}
                                        className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="block text-xs text-gray-400 uppercase font-semibold">Members</span>
                                    <span className="text-lg font-bold text-gray-800">{selectedHousehold.properties.member_count}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <span className="block text-xs text-gray-400 uppercase font-semibold">Structure Info</span>
                                    <span className="text-sm font-semibold text-gray-800 block">{selectedHousehold.properties.housing_status}</span>
                                    <span className="text-xs text-gray-500 block">{selectedHousehold.properties.dwelling_type}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 col-span-2">
                                    <span className="block text-xs text-gray-400 uppercase font-semibold mb-2">Household Flags</span>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedHousehold.properties.is_4ps_beneficiary && <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-semibold">4Ps Present</span>}
                                        {selectedHousehold.properties.has_senior_citizen && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-semibold">Senior Present</span>}
                                        {selectedHousehold.properties.has_pwd && <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-xs font-semibold">PWD Present</span>}
                                        {selectedHousehold.properties.has_solo_parent && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-xs font-semibold">Solo Parent Present</span>}
                                        
                                        {!selectedHousehold.properties.is_4ps_beneficiary && 
                                         !selectedHousehold.properties.has_senior_citizen && 
                                         !selectedHousehold.properties.has_pwd && 
                                         !selectedHousehold.properties.has_solo_parent && 
                                         <span className="text-gray-500 text-sm italic">Standard Household</span>}
                                    </div>
                                </div>
                            </div>

                            {/* THE NESTED RESIDENT TABLE */}
                            <div className="mt-6 border-t border-gray-100 pt-6">
                                <h3 className="text-sm font-bold text-gray-800 uppercase mb-3">
                                    Residents ({selectedHousehold.properties.member_count})
                                </h3>
                                
                                {selectedHousehold.properties.residents && selectedHousehold.properties.residents.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="border-b border-gray-200 text-gray-500">
                                                    <th className="pb-2 font-medium">Name</th>
                                                    <th className="pb-2 font-medium">Role</th>
                                                    <th className="pb-2 font-medium">Sex</th>
                                                    <th className="pb-2 font-medium">Civil Status</th>
                                                    <th className="pb-2 font-medium">Flags</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedHousehold.properties.residents.map(person => (
                                                    <tr key={person.id} className="hover:bg-gray-50">
                                                        <td className="py-2 font-medium text-gray-900 flex items-center gap-2">
                                                            {person.first_name} {person.last_name}
                                                            {person.relationship_to_head === 'Head' && (
                                                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">Head</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 text-gray-600">{person.relationship_to_head}</td>
                                                        <td className="py-2 text-gray-600">{person.sex}</td>
                                                        <td className="py-2 text-gray-600">{person.civil_status}</td>
                                                        <td className="py-2 flex gap-1 flex-wrap">
                                                            {person.has_senior_citizen && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Senior</span>}
                                                            {person.is_4ps_beneficiary && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">4Ps</span>}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded text-center">
                                        No residents mapped here yet.
                                    </p>
                                )}
                            </div>

                        </div>
                    )}
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
                        // Instantly refresh the map and details panel to show the newly added person!
                        fetchHouseholds(searchQuery); 
                    }}
                />
            )}
        </div>
    );
}