import React, { useState, useEffect } from "react";
const API_URL = import.meta.env.VITE_API_URL;

export default function ResidentApprovals() {
    const [pendingResidents, setPendingResidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States for ID viewing and Rejection Reason input
    const [selectedIdImage, setSelectedIdImage] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<number | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

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

    const handleAction = async (id: number, status: 'APPROVED' | 'REJECTED', reason = '') => {
        const token = localStorage.getItem('access');
        try {
            const response = await fetch(`${API_URL}/api/resident-approvals/${id}/update_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, rejection_reason: reason })
            });

            if (response.ok) {
                // Remove the handled item from state instantly
                setPendingResidents(pendingResidents.filter(r => r.id !== id));
                setRejectingId(null);
                setRejectionReason("");
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            console.error("Error updating resident status:", error);
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            
            
            <div className="flex flex-1 overflow-hidden">
                
                
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="w-full">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Resident Account Approvals</h1>
                            <p className="text-gray-500 text-sm">Verify and approve resident registration profiles claiming pre-registered records or submitting new applications.</p>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resident Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Birthdate / Purok</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valid ID</th>
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
                                                    <div>{resident.birth_date}</div>
                                                    <span className="text-xs text-gray-400">Purok: {resident.purok}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {resident.id_picture ? (
                                                        <button 
                                                            onClick={() => setSelectedIdImage(resident.id_picture)}
                                                            className="text-green-600 hover:underline text-xs font-medium bg-green-50 px-2.5 py-1 rounded-md"
                                                        >
                                                            View ID
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No ID Attached</span>
                                                    )}
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
                                                            onClick={() => setRejectingId(resident.id)}
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

            {/* ID PREVIEW MODAL */}
            {selectedIdImage && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl relative">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Submitted Valid ID</h3>
                        <div className="flex justify-center bg-gray-100 p-2 rounded-md border border-gray-200 max-h-[60vh] overflow-auto">
                            <img src={selectedIdImage} alt="Resident ID" className="max-h-[50vh] object-contain rounded" />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button 
                                onClick={() => setSelectedIdImage(null)}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-semibold"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* REJECTION REASON MODAL */}
            {rejectingId !== null && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Resident Application</h3>
                        <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejection so the resident knows what to fix.</p>
                        
                        <textarea 
                            rows={3}
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., ID picture is blurry or name does not match records..."
                            className="w-full p-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 outline-none mb-4"
                        />

                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => { setRejectingId(null); setRejectionReason(""); }}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-semibold"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => handleAction(rejectingId, 'REJECTED', rejectionReason)}
                                disabled={!rejectionReason.trim()}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}