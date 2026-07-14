import React, { useState, useEffect } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import ResidentModal, { type ResidentProperties } from '../components/ResidentModal';

const API_URL = import.meta.env.VITE_API_URL;

// --- Types mapping to Django Model ---
interface ResidentData {
    id: number;
    first_name: string;
    last_name: string;
    purok: string;
    birth_date: string | null;
    civil_status: string;
    relationship_to_head: string;
    household?: number | null;
    is_4ps_beneficiary: boolean;
    has_senior_citizen: boolean;
    has_pwd: boolean;
    has_solo_parent: boolean;
}

// --- UI Helper Functions ---
const calculateAge = (dob: string | null) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

const getAvatarColor = (id: number) => {
    const colors = ['bg-[#1e40af]', 'bg-[#065f46]', 'bg-[#4338ca]', 'bg-[#ea580c]', 'bg-[#d97706]', 'bg-[#dc2626]', 'bg-[#1d4ed8]', 'bg-[#0f766e]'];
    return colors[id % colors.length];
};

const getWelfareBadge = (res: ResidentData) => {
    if (res.is_4ps_beneficiary) return { label: '4Ps', bg: 'bg-red-50', text: 'text-red-600' };
    if (res.has_senior_citizen) return { label: 'Senior', bg: 'bg-orange-50', text: 'text-orange-600' };
    if (res.has_pwd) return { label: 'PWD', bg: 'bg-blue-50', text: 'text-blue-600' };
    if (res.has_solo_parent) return { label: 'Solo Parent', bg: 'bg-green-50', text: 'text-green-700' };
    return { label: 'None', bg: 'bg-gray-100', text: 'text-gray-500' };
};

export default function ResidentPage() {
    // --- State ---
    const [residents, setResidents] = useState<ResidentData[]>([]);
    
    // NEW: Store the list of households for the dropdown
    const [householdOptions, setHouseholdOptions] = useState<{id: number, address: string}[]>([]);
    
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedResident, setSelectedResident] = useState<ResidentProperties | null>(null);

    // --- API Integration ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // 1. Fetch Residents (GET)
    const fetchResidents = async (query = '') => {
        try {
            const url = query 
                ? `${API_URL}/api/residents/?search=${encodeURIComponent(query)}` 
                : `${API_URL}/api/residents/`;

            const response = await fetch(url, { headers: getAuthHeaders() });
            
            if (response.ok) {
                const data = await response.json();
                setResidents(data.results || data); 
            } else {
                console.error("Failed to fetch residents:", response.statusText);
            }
        } catch (error) {
            console.error("Network error fetching residents:", error);
        }
    };

    // NEW 2. Fetch Households for the Dropdown Modal
    const fetchHouseholdsForDropdown = async () => {
        try {
            const response = await fetch(`${API_URL}/api/households/`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                // We format the GeoJSON response into a simple ID and Address array
                const formatted = (data.features || []).map((f: any) => ({
                    id: f.id,
                    address: f.properties.address
                }));
                setHouseholdOptions(formatted);
            }
        } catch (error) {
            console.error("Error fetching households:", error);
        }
    };

    // Load household options exactly once when the page loads
    useEffect(() => {
        fetchHouseholdsForDropdown();
    }, []);

    // Debounced Search Effect for Residents
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchResidents(searchQuery);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // 3. Save Resident (POST or PUT)
    const handleSaveResident = async (formData: Partial<ResidentProperties>) => {
        try {
            const method = modalMode === 'edit' ? 'PUT' : 'POST';
            const url = modalMode === 'edit' 
                ? `${API_URL}/api/residents/${selectedResident?.id}/` 
                : `${API_URL}/api/residents/`;

            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchResidents(searchQuery); // Refresh the table
            } else {
                const errorData = await response.json();
                console.error("Validation Error:", errorData);
                alert("Failed to save. Check console for details.");
            }
        } catch (error) {
            console.error("Network error saving resident:", error);
            alert("Network error occurred.");
        }
    };

    // 4. Delete Resident (DELETE)
    const handleDeleteResident = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this resident? This cannot be undone.")) return;

        try {
            const response = await fetch(`${API_URL}/api/residents/${id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });

            if (response.ok || response.status === 204) {
                fetchResidents(searchQuery); // Refresh the table
            } else {
                console.error("Failed to delete resident:", response.statusText);
                alert("Failed to delete resident.");
            }
        } catch (error) {
            console.error("Network error deleting resident:", error);
            alert("Network error occurred.");
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    {/* Header Section */}
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Information</h1>
                            <p className="text-gray-500 text-sm">Barangay Census Database</p>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setModalMode('add');
                                setSelectedResident(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 shadow-sm transition-colors flex items-center gap-2"
                        >
                            <span>+ Add Resident</span>
                        </button>
                    </div>

                    {/* Data Table Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-white">
                            <div className="relative flex-1 max-w-3xl">
                                <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder="Search residents by name or purok..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-200">
                                <thead>
                                    <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4 w-24">Photo</th>
                                        <th className="px-6 py-4">Name</th>
                                        {/* NEW COLUMN: Household Status */}
                                        <th className="px-6 py-4">Household Status</th>
                                        <th className="px-6 py-4">Purok</th>
                                        <th className="px-6 py-4">Age</th>
                                        <th className="px-6 py-4">Civil Status</th>
                                        <th className="px-6 py-4">Welfare</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {residents.length > 0 ? residents.map((resident) => {
                                        const badge = getWelfareBadge(resident);
                                        const initials = `${resident.first_name[0]}${resident.last_name[0]}`.toUpperCase();
                                        
                                        // Find the matching household address if they have one mapped
                                        const mappedHouse = householdOptions.find(h => h.id === resident.household);
                                        
                                        return (
                                            <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.id}</td>
                                                
                                                <td className="px-6 py-4">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-sm ${getAvatarColor(resident.id)}`}>
                                                        {initials}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {resident.first_name} {resident.last_name}
                                                </td>

                                                {/* NEW DATA CELL: Displaying the address or Unmapped status */}
                                                <td className="px-6 py-4 text-sm">
                                                    {mappedHouse ? (
                                                        <div>
                                                            <span className="text-gray-900 block truncate max-w-50" title={mappedHouse.address}>
                                                                {mappedHouse.address}
                                                            </span>
                                                            <span className="text-xs text-blue-600 font-medium">Mapped</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-red-500 italic flex items-center gap-1">
                                                            <span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span> Unmapped
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.purok}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{calculateAge(resident.birth_date)}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.civil_status}</td>
                                                
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide ${badge.bg} ${badge.text}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* Edit Button */}
                                                        <button 
                                                            onClick={() => {
                                                                setModalMode('edit');
                                                                setSelectedResident(resident as any);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors" 
                                                            title="View/Edit Details"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </button>

                                                        {/* Delete Button */}
                                                        <button 
                                                            className="p-1.5 bg-[#ef4444] text-white rounded hover:bg-red-600 shadow-sm transition-colors" 
                                                            title="Delete Resident"
                                                            onClick={() => handleDeleteResident(resident.id)}
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500 italic">
                                                No residents found. Add a resident or adjust your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ResidentModal 
                    mode={modalMode}
                    resident={selectedResident}
                    households={householdOptions} // PASS THE FETCHED DATA TO THE MODAL
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveResident}
                />
            )}
        </div>
    );
}