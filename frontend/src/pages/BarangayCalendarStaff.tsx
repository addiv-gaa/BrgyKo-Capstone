import React, { useState, useEffect } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import BarangayCalendar from "../components/BarangayCalendar";

const API_URL = import.meta.env.VITE_API_URL;

export default function StaffSchedulePage() {
    const [formData, setFormData] = useState({
        title: '',
        event_type: 'ACTIVITY',
        description: '',
        start_time: '',
        end_time: ''
    });

    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        const token = localStorage.getItem('access');
        try {
            const response = await fetch(`${API_URL}/api/reservations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const pending = data.filter((req: any) => req.status === 'PENDING');
                setPendingRequests(pending);
            }
        } catch (error) {
            console.error("Error fetching pending requests:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('access');
        
        await fetch(`${API_URL}/api/events/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        alert("Event added to calendar!");
        window.location.reload(); 
    };

    const handleStatusUpdate = async (id: number, newStatus: string) => {
        const token = localStorage.getItem('access');
        
        try {
            const response = await fetch(`${API_URL}/api/reservations/${id}/update_status/`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                alert(`Reservation ${newStatus}!`);
                window.location.reload(); 
            } else {
                alert("Failed to update status. Check permissions.");
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const getRequestedItem = (req: any) => {
        if (req.facility) {
            return req.facility_name || req.facility.name || `Facility (ID: ${req.facility})`;
        }
        if (req.equipment) {
            const qty = req.equipment_quantity ? ` (Qty: ${req.equipment_quantity})` : '';
            const name = req.equipment_name || req.equipment.name || `Equipment (ID: ${req.equipment})`;
            return `${name}${qty}`;
        }
        return 'Unknown Item';
    };

    const openModal = (req: any) => setSelectedRequest(req);
    const closeModal = () => setSelectedRequest(null);

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="w-full h-full"> 
                        <h1 className="text-2xl font-bold mb-6">Manage Schedule & Events</h1>
                        
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-8">
                            <div className="xl:col-span-3">
                                <BarangayCalendar />
                            </div>

                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
                                <h2 className="text-lg font-bold mb-4">Add to Calendar</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Type</label>
                                        <select 
                                            value={formData.event_type}
                                            onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-600"
                                        >
                                            <option value="ACTIVITY">Barangay Activity</option>
                                            <option value="ABSENCE">Official Absence</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Title / Name</label>
                                        <input 
                                            type="text" required
                                            value={formData.title}
                                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                                            placeholder="e.g. Kapitan on Leave"
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Start Time</label>
                                        <input 
                                            type="datetime-local" required
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">End Time</label>
                                        <input 
                                            type="datetime-local" required
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                            className="w-full border p-2 rounded outline-none focus:ring-2 focus:ring-blue-600"
                                        />
                                    </div>
                                    <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 mt-2 transition-colors">
                                        Save to Calendar
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-4">Pending Reservation Requests</h2>
                            
                            {pendingRequests.length === 0 ? (
                                <p className="text-gray-500 text-sm">No pending requests at the moment.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-gray-600">ID</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Requested Item</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Purpose</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Start Time</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">End Time</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {pendingRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-500">#{req.id}</td>
                                                    <td className="px-4 py-3 font-bold text-blue-700">{getRequestedItem(req)}</td>
                                                    <td className="px-4 py-3 font-medium truncate max-w-50">{req.purpose}</td>
                                                    <td className="px-4 py-3">{new Date(req.start_time).toLocaleString()}</td>
                                                    <td className="px-4 py-3">{new Date(req.end_time).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button 
                                                            onClick={() => openModal(req)}
                                                            className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded font-medium transition-colors"
                                                        >
                                                            View
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                                                            className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded font-medium transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleStatusUpdate(req.id, 'REJECTED')}
                                                            className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded font-medium transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity p-4">
                    {/* Added max-h-screen and overflow-y-auto to handle vertically tall content */}
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                        
                        <div className="flex justify-between items-center p-5 border-b border-gray-200 shrink-0">
                            <h2 className="text-lg font-bold text-gray-900">Reservation Details</h2>
                            <button 
                                onClick={closeModal}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-md border border-gray-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        {/* Modal Body: Added overflow-y-auto here to allow scrolling inside the modal if it gets too tall */}
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Request ID</span>
                                <span className="col-span-2 font-medium text-gray-900 wrap-break-word">#{selectedRequest.id}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Item/Facility</span>
                                {/* Added break-words to handle extremely long item names */}
                                <span className="col-span-2 font-bold text-blue-700 wrap-break-word">{getRequestedItem(selectedRequest)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Purpose</span>
                                {/* Added break-words to prevent long text from spilling out */}
                                <span className="col-span-2 font-medium text-gray-900 wrap-break-word">{selectedRequest.purpose}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b border-gray-100 pb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Start Time</span>
                                <span className="col-span-2 font-medium text-gray-900 wrap-break-word">{new Date(selectedRequest.start_time).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">End Time</span>
                                <span className="col-span-2 font-medium text-gray-900 wrap-break-word">{new Date(selectedRequest.end_time).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button 
                                onClick={() => handleStatusUpdate(selectedRequest.id, 'REJECTED')}
                                className="px-4 py-2 border border-red-200 bg-red-50 text-red-700 rounded-md text-sm font-semibold hover:bg-red-100 transition-colors"
                            >
                                Reject Request
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate(selectedRequest.id, 'APPROVED')}
                                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold transition-colors shadow-sm"
                            >
                                Approve Request
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
}