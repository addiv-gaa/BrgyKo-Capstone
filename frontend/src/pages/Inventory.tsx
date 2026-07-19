import { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

interface Equipment {
    id: number;
    name: string;
    total_quantity: number; // CHANGED to match Django
    status: 'Available' | 'Maintenance' | 'Out of Stock';
}

interface Facility {
    id: number;
    name: string;
    description: string;
    status: 'Available' | 'Maintenance';
}

export default function EquipmentFacilitiesPage() {
    const [activeTab, setActiveTab] = useState<'equipment' | 'facilities'>('equipment');
    
    const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
    const [facilityList, setFacilityList] = useState<Facility[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        total_quantity: 1, // CHANGED to match Django
        description: '', 
        status: 'Available'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('access');
        try {
            const [eqRes, facRes] = await Promise.all([
                fetch(`${API_URL}/api/equipment/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/facilities/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (eqRes.ok) setEquipmentList(await eqRes.json());
            if (facRes.ok) setFacilityList(await facRes.json());
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAddModal = () => {
        setEditingItemId(null);
        setFormData({ name: '', total_quantity: 1, description: '', status: 'Available' });
        setIsAddModalOpen(true);
    };

    const handleEditClick = (item: any) => {
        setEditingItemId(item.id);
        setFormData({
            name: item.name,
            total_quantity: item.total_quantity || 1, // CHANGED
            description: item.description || '',
            status: item.status
        });
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        const itemType = activeTab === 'equipment' ? 'equipment' : 'facility';
        const confirmDelete = window.confirm(`Are you sure you want to delete this ${itemType}? This cannot be undone.`);
        
        if (!confirmDelete) return;

        const token = localStorage.getItem('access');
        const endpoint = activeTab === 'equipment' ? 'equipment' : 'facilities';

        try {
            const response = await fetch(`${API_URL}/api/${endpoint}/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                fetchData();
            } else {
                alert(`Failed to delete ${itemType}. It might be tied to an existing reservation.`);
            }
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Network error occurred.");
        }
    };

    const resetForm = () => {
        setIsAddModalOpen(false);
        setEditingItemId(null);
        setFormData({ name: '', total_quantity: 1, description: '', status: 'Available' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return alert("Name is required.");

        setIsSubmitting(true);
        const token = localStorage.getItem('access');
        
        const endpoint = activeTab === 'equipment' ? 'equipment' : 'facilities';
        const url = editingItemId 
            ? `${API_URL}/api/${endpoint}/${editingItemId}/` 
            : `${API_URL}/api/${endpoint}/`;
        
        const method = editingItemId ? 'PATCH' : 'POST';

        // CHANGED: sending total_quantity to backend
        const payload = activeTab === 'equipment' 
            ? { name: formData.name, total_quantity: formData.total_quantity, status: formData.status }
            : { name: formData.name, description: formData.description, status: formData.status };

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                fetchData(); 
                resetForm();
            } else {
                // NEW: Capture and print the exact error from Django to the console
                const errorData = await response.json();
                console.error("Django API Error:", errorData);
                
                // Show a more descriptive alert
                const errorMsg = typeof errorData === 'object' ? JSON.stringify(errorData) : 'Unknown error';
                alert(`Failed to save ${activeTab}. Error: ${errorMsg}`);
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeList = activeTab === 'equipment' ? equipmentList : facilityList;
    
    // CHANGED: reducing by item.total_quantity and added a fallback to 0
    const totalItems = activeTab === 'equipment' 
        ? equipmentList.reduce((sum, item) => sum + (item.total_quantity || 0), 0)
        : facilityList.length;
    
    const availableItems = activeList.filter(i => i.status === 'Available').length;
    const maintenanceItems = activeList.filter(i => i.status === 'Maintenance').length;

    const filteredItems = activeList.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-700';
            case 'Maintenance': return 'bg-orange-100 text-orange-700';
            case 'Out of Stock': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f8fafc]">
                    <div className="w-full h-full space-y-6">
                        
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Resource Management</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage barangay facilities and equipment inventory.</p>
                            </div>
                            <button 
                                onClick={handleOpenAddModal}
                                className="bg-[#1c4ed8] hover:bg-blue-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                Add {activeTab === 'equipment' ? 'Equipment' : 'Facility'}
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex space-x-1 bg-gray-200/50 p-1 rounded-lg w-fit">
                            <button
                                onClick={() => setActiveTab('equipment')}
                                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                                    activeTab === 'equipment' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Equipment
                            </button>
                            <button
                                onClick={() => setActiveTab('facilities')}
                                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                                    activeTab === 'facilities' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                Facilities
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total {activeTab === 'equipment' ? 'Units' : 'Facilities'}</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Available Types</p>
                                    <p className="text-2xl font-bold text-gray-900">{availableItems}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Under Maintenance</p>
                                    <p className="text-2xl font-bold text-gray-900">{maintenanceItems}</p>
                                </div>
                            </div>
                        </div>

                        {/* Search and Table Container */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-200">
                                <div className="relative max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder={`Search ${activeTab}...`}
                                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider border-b border-gray-200">
                                            <th className="px-6 py-4">Name</th>
                                            {activeTab === 'equipment' && <th className="px-6 py-4">Total Quantity</th>}
                                            {activeTab === 'facilities' && <th className="px-6 py-4">Description</th>}
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {isLoading ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading {activeTab}...</td></tr>
                                        ) : filteredItems.length === 0 ? (
                                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No {activeTab} found.</td></tr>
                                        ) : (
                                            filteredItems.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                                                    {/* CHANGED: rendering total_quantity in the table */}
                                                    {activeTab === 'equipment' && <td className="px-6 py-4">{item.total_quantity} units</td>}
                                                    {activeTab === 'facilities' && <td className="px-6 py-4 truncate max-w-xs">{item.description || '-'}</td>}
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 flex gap-2">
                                                        <button 
                                                            onClick={() => handleEditClick(item)}
                                                            title="Edit"
                                                            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(item.id)}
                                                            title="Delete"
                                                            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Dynamic Modal Overlay */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                        
                        <div className="flex justify-between items-center p-5 border-b border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingItemId ? `Edit ${activeTab === 'equipment' ? 'Equipment' : 'Facility'}` : `Add New ${activeTab === 'equipment' ? 'Equipment' : 'Facility'}`}
                            </h2>
                            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 p-1 rounded-md border border-gray-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Name</label>
                                    <input 
                                        type="text" required
                                        placeholder={activeTab === 'equipment' ? "e.g. Monobloc Chair" : "e.g. Barangay Covered Court"}
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>

                                {activeTab === 'equipment' ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Quantity Owned</label>
                                        <input 
                                            type="number" min="1" required
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.total_quantity} // CHANGED to bind to total_quantity
                                            onChange={(e) => setFormData({...formData, total_quantity: parseInt(e.target.value) || 1})} // CHANGED
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description / Details</label>
                                        <textarea 
                                            rows={3}
                                            placeholder="Location details or capacity..."
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                                    <select 
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={formData.status}
                                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Maintenance">Maintenance</option>
                                        {activeTab === 'equipment' && <option value="Out of Stock">Out of Stock</option>}
                                    </select>
                                </div>
                            </div>

                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button type="button" onClick={resetForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#1c4ed8] hover:bg-blue-800 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
                                    {isSubmitting ? 'Saving...' : 'Save Data'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}