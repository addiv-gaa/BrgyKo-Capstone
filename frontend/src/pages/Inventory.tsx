import React, { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

interface InventoryItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    status: 'Available' | 'Borrowed' | 'For Repair';
    borrower: string | null;
    due_date: string | null;
}

export default function InventoryManagement() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    
    // NEW: Track if we are editing an existing item. If null, we are adding a new item.
    const [editingItemId, setEditingItemId] = useState<number | null>(null);

    const [newItemData, setNewItemData] = useState({
        name: '',
        category: 'Equipment',
        quantity: 1,
        status: 'Available',
        borrower: '',
        due_date: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchInventory = async () => {
            const token = localStorage.getItem('access');
            try {
                const response = await fetch(`${API_URL}/api/inventory/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setItems(Array.isArray(data) ? data : (data.results || []));
                }
            } catch (error) {
                console.error("Error fetching inventory:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, []);

    // NEW: Function to open the modal in Edit Mode
    const handleEditClick = (item: InventoryItem) => {
        setEditingItemId(item.id);
        setNewItemData({
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            status: item.status,
            borrower: item.borrower || '',
            due_date: item.due_date || ''
        });
        setIsAddModalOpen(true);
    };

    // NEW: Helper to reset the form back to default "Add" mode
    const handleOpenAddModal = () => {
    setEditingItemId(null); // Ensure we are in "Add" mode
    setNewItemData({ 
        name: '', 
        category: 'Equipment', 
        quantity: 1, 
        status: 'Available',
        borrower: '',
        due_date: ''
    });
    setIsAddModalOpen(true); // Open the modal
};

// 2. Used only for canceling or closing
const resetForm = () => {
    setIsAddModalOpen(false);
    setEditingItemId(null);
    setNewItemData({ 
        name: '', 
        category: 'Equipment', 
        quantity: 1, 
        status: 'Available',
        borrower: '',
        due_date: ''
    });
};

    // UPDATED: Now handles both Adding (POST) and Editing (PUT)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!newItemData.name.trim()) {
            alert("Item name is required.");
            return;
        }

        const payload = { ...newItemData };
        if (payload.status !== 'Borrowed') {
            payload.borrower = '';
            payload.due_date = '';
        }

        setIsSubmitting(true);
        const token = localStorage.getItem('access');

        // Dynamically set URL and Method based on whether we are editing or adding
        const url = editingItemId 
            ? `${API_URL}/api/inventory/${editingItemId}/` 
            : `${API_URL}/api/inventory/`;
        
        const method = editingItemId ? 'PUT' : 'POST';

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
                const savedItem = await response.json();
                
                if (editingItemId) {
                    // Update the specific item in the table without reloading the page
                    setItems(items.map(item => item.id === editingItemId ? savedItem : item));
                } else {
                    // Add the new item to the top of the table
                    setItems([savedItem, ...items]); 
                }
                
                resetForm();
            } else {
                console.error("Failed to save item:", response.status);
                alert("Failed to save item to the database.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const availableItems = items.filter(i => i.status === 'Available').reduce((sum, item) => sum + item.quantity, 0);
    const borrowedItems = items.filter(i => i.status === 'Borrowed').reduce((sum, item) => sum + item.quantity, 0);
    const repairItems = items.filter(i => i.status === 'For Repair').reduce((sum, item) => sum + item.quantity, 0);

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Available': return 'bg-green-100 text-green-700';
            case 'Borrowed': return 'bg-orange-100 text-orange-700';
            case 'For Repair': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="shrink-0 w-full">
                <PageHeader />
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="shrink-0 h-full">
                    <Sidebar />
                </div>
                
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f8fafc]">
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                                <p className="text-gray-500 text-sm mt-1">Equipment & Supplies Tracker</p>
                            </div>
                            <button 
                                onClick={handleOpenAddModal} // Ensures modal opens completely blank
                                className="bg-[#1c4ed8] hover:bg-blue-800 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                                Add Item
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Total Items</p>
                                    <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Available</p>
                                    <p className="text-2xl font-bold text-gray-900">{availableItems}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Borrowed</p>
                                    <p className="text-2xl font-bold text-gray-900">{borrowedItems}</p>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">Overdue/Repair</p>
                                    <p className="text-2xl font-bold text-gray-900">{repairItems}</p>
                                </div>
                            </div>
                        </div>

                        {/* Search and Table Container */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="p-4 border-b border-gray-200">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Search inventory..." 
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
                                            <th className="px-6 py-4">Item</th>
                                            <th className="px-6 py-4">Category</th>
                                            <th className="px-6 py-4">Qty</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Borrower</th>
                                            <th className="px-6 py-4">Due</th>
                                            <th className="px-6 py-4">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                        {isLoading ? (
                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td></tr>
                                        ) : filteredItems.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No items found.</td></tr>
                                        ) : (
                                            filteredItems.map((item) => (
                                                <tr key={item.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{item.name}</td>
                                                    <td className="px-6 py-4">{item.category}</td>
                                                    <td className="px-6 py-4">{item.quantity}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">{item.borrower || '-'}</td>
                                                    <td className="px-6 py-4">{item.due_date || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        {/* NEW: Wired up the Edit button */}
                                                        <button 
                                                            onClick={() => handleEditClick(item)}
                                                            className="p-1.5 border border-gray-200 rounded-md text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
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

            {/* The Modal Overlay */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                        
                        <div className="flex justify-between items-center p-5 border-b border-gray-200">
                            {/* Dynamically change the title */}
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingItemId ? "Edit Inventory Item" : "Add Inventory Item"}
                            </h2>
                            <button 
                                onClick={resetForm}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-md border border-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Note: Changed onSubmit from handleAddItem to handleSubmit */}
                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-5">
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Item Name</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="e.g. Portable Generator"
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newItemData.name}
                                        onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Category</label>
                                        <select 
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            value={newItemData.category}
                                            onChange={(e) => setNewItemData({...newItemData, category: e.target.value})}
                                        >
                                            <option value="Emergency">Emergency</option>
                                            <option value="Equipment">Equipment</option>
                                            <option value="Supplies">Supplies</option>
                                            <option value="Office">Office</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quantity</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            required
                                            className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={newItemData.quantity}
                                            onChange={(e) => setNewItemData({...newItemData, quantity: parseInt(e.target.value) || 1})}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</label>
                                    <select 
                                        className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={newItemData.status}
                                        onChange={(e) => setNewItemData({...newItemData, status: e.target.value as InventoryItem['status']})}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Borrowed">Borrowed</option>
                                        <option value="For Repair">For Repair</option>
                                    </select>
                                </div>

                                {newItemData.status === 'Borrowed' && (
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Borrower Name</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="e.g. Juan dela Cruz"
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                value={newItemData.borrower}
                                                onChange={(e) => setNewItemData({...newItemData, borrower: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Due Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                                value={newItemData.due_date}
                                                onChange={(e) => setNewItemData({...newItemData, due_date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                )}

                            </div>

                            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button 
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-[#1c4ed8] hover:bg-blue-800 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/></svg>
                                    {/* Dynamically change the button text */}
                                    {isSubmitting ? 'Saving...' : (editingItemId ? 'Save Changes' : 'Add Item')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}