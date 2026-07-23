import React, { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

export default function ResidentApprovals() {
    const [pendingResidents, setPendingResidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPendingResidents();
    }, []);

    const fetchPendingResidents = async () => {
        const token = localStorage.getItem('access');
        try {
            const response = await fetch(`${API_URL}/api/resident-approvals/pending/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setPendingResidents(await response.json());
            }
        } catch (error) {
            console.error("Error fetching pending residents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        const token = localStorage.getItem('access');
        try {
            const response = await fetch(`${API_URL}/api/resident-approvals/${id}/update_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.ok) {
                // Remove the handled item from state instantly
                setPendingResidents(pendingResidents.filter(r => r.id !== id));
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            console.error("Error updating resident status:", error);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="shrink-0 w-full"><PageHeader /></div>
            
            <div className="flex flex-1 overflow-hidden">
                <div className="shrink-0 h-full"><Sidebar /></div>
                
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="w-full">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Resident Account Approvals</h1>
                            <p className="text-gray-500 text-sm">Verify and approve resident registration profiles claiming pre-registered records.</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resident Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Birthdate</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Linked User Email</th>
                                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {isLoading ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading pending accounts...</td></tr>
                                    ) : pendingResidents.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No pending resident approvals found.</td></tr>
                                    ) : (
                                        pendingResidents.map((resident) => (
                                            <tr key={resident.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                    {resident.first_name} {resident.last_name}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {resident.birth_date}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {resident.user_email || "N/A"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleAction(resident.id, 'APPROVED')}
                                                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button 
                                                            onClick={() => handleAction(resident.id, 'REJECTED')}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}