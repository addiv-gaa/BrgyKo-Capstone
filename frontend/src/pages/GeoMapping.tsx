import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import HouseholdModal from '../components/HouseholdModal'
import Sidebar from '../components/sidebar';
import PageHeader from '../components/header';

const API_URL = import.meta.env.VITE_API_URL;

// --- Types ---
interface HouseholdProperties {
    id?: number; 
    head_of_household: string;
    address: string;
    member_count: number;
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
    has_pwd: boolean;
    has_solo_parent: boolean;
    housing_status: string;
    dwelling_type: string;
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
    // --- State Management ---
    const [households, setHouseholds] = useState<GeoJSONFeature[]>([]);
    const [selectedHousehold, setSelectedHousehold] = useState<GeoJSONFeature | null>(null);
    const [isAddMode, setIsAddMode] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [pendingCoords, setPendingCoords] = useState<{lat: number, lng: number} | null>(null);
    
    // NEW: Search state
    const [searchQuery, setSearchQuery] = useState('');

    // --- API Integration ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // 1. Fetch Households (GET) - UPDATED to accept a query string
    const fetchHouseholds = async (query: string = '') => {
        try {
            // Append the search parameter if a query exists
            const url = query 
                ? `${API_URL}/api/households/?search=${encodeURIComponent(query)}` 
                : `${API_URL}/api/households/`;

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                setHouseholds(data.features || []);
            } else {
                console.error("Failed to fetch households:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching map data:", error);
        }
    };

    // Fetch data on initial load AND when searchQuery changes (Debounced)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHouseholds(searchQuery);
        }, 300); // Waits 300ms after the user stops typing to ping the backend

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // 2. Save Household (POST or PUT)
    const handleSaveHousehold = async (formData: Partial<HouseholdProperties>) => {
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
                
                // Pass current search query so the map doesn't un-filter itself after saving
                fetchHouseholds(searchQuery); 
            } else {
                const errorData = await response.json();
                console.error("Validation Error from Django:", errorData);
                alert("Failed to save household. Check console for details.");
            }
        } catch (error) {
            console.error("Network error saving household:", error);
            alert("Network error occurred.");
        }
    };

    // 3. Delete Household (DELETE)
    const handleDeleteHousehold = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this household? This cannot be undone.")) {
            return; 
        }

        try {
            const response = await fetch(`${API_URL}/api/households/${id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok || response.status === 204) {
                setSelectedHousehold(null);
                fetchHouseholds(searchQuery); // Preserve search state after deleting
            } else {
                console.error("Failed to delete household:", response.statusText);
                alert("Failed to delete household. Check console for details.");
            }
        } catch (error) {
            console.error("Network error deleting household:", error);
            alert("Network error occurred.");
        }
    };

    // Map click handler sub-component
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
                        
                        {/* NEW: Search Bar and Add Button Group */}
                        <div className="flex items-center gap-3 w-full lg:w-auto">
                            <input 
                                type="text"
                                placeholder="Search name or address..."
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
                                {isAddMode ? 'Cancel Adding Marker' : '+ Add Household Marker'}
                            </button>
                        </div>
                    </div>

                    {isAddMode && (
                        <div className="mb-4 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-pulse">
                            ℹ️ Click anywhere on the map to place a new household marker.
                        </div>
                    )}

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
                                        eventHandlers={{
                                            click: () => setSelectedHousehold(feature)
                                        }}
                                    />
                                );
                            })}
                        </MapContainer>

                        <div className="absolute bottom-6 left-6 z-1000 bg-white p-3 rounded-lg shadow-md border border-gray-200 pointer-events-none">
                            <h3 className="text-xs font-bold text-gray-800 mb-2">Households</h3>
                            <div className="space-y-1.5 text-xs text-gray-600">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600 border border-white outline outline-gray-300"></div> Regular</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500 border border-white outline outline-gray-300"></div> Senior/PWD</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 border border-white outline outline-gray-300"></div> 4Ps Beneficiary</div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500 border border-white outline outline-gray-300"></div> Solo Parent</div>
                            </div>
                        </div>
                    </div>

                    {selectedHousehold && (
                        <div className="mt-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in-up">
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedHousehold.properties.head_of_household}</h2>
                                    <p className="text-gray-500">{selectedHousehold.properties.address}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setModalMode('edit');
                                            setIsModalOpen(true);
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Edit Information
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
                                    <span className="block text-xs text-gray-400 uppercase font-semibold">Housing</span>
                                    <span className="text-sm font-semibold text-gray-800">{selectedHousehold.properties.housing_status}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 col-span-2">
                                    <span className="block text-xs text-gray-400 uppercase font-semibold mb-2">Vulnerability Flags</span>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedHousehold.properties.is_4ps_beneficiary && <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-semibold">4Ps Beneficiary</span>}
                                        {selectedHousehold.properties.has_senior_citizen && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-semibold">Senior Citizen</span>}
                                        {selectedHousehold.properties.has_pwd && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-semibold">PWD</span>}
                                        {selectedHousehold.properties.has_solo_parent && <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded text-xs font-semibold">Solo Parent</span>}
                                        
                                        {!selectedHousehold.properties.is_4ps_beneficiary && 
                                         !selectedHousehold.properties.has_senior_citizen && 
                                         !selectedHousehold.properties.has_pwd && 
                                         !selectedHousehold.properties.has_solo_parent && 
                                         <span className="text-gray-500 text-sm italic">Regular Household</span>}
                                    </div>
                                </div>
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
        </div>
    );
}