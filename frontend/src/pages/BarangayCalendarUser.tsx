import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import BarangayCalendar from "../components/BarangayCalendar";

const API_URL = import.meta.env.VITE_API_URL;

export default function ResidentSchedulePage() {
    const navigate = useNavigate();
    
    const [myReservations, setMyReservations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMyReservations();
    }, []);

    const fetchMyReservations = async () => {
        const token = localStorage.getItem('access');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/api/reservations/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                setMyReservations(data);
            }
        } catch (error) {
            console.error("Error fetching personal reservations:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Function to handle cancellations
    const handleCancel = async (id: number) => {
        const confirmCancel = window.confirm("Are you sure you want to cancel this reservation?");
        if (!confirmCancel) return;

        const token = localStorage.getItem('access');
        
        try {
            const response = await fetch(`${API_URL}/api/reservations/${id}/cancel/`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert("Reservation cancelled successfully.");
                fetchMyReservations(); // Refresh the list
            } else {
                const data = await response.json();
                alert(data.error || "Failed to cancel reservation.");
            }
        } catch (error) {
            console.error("Error cancelling reservation:", error);
            alert("Network error occurred.");
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': 
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Approved</span>;
            case 'REJECTED': 
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Rejected</span>;
            case 'CANCELLED': 
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold">Cancelled</span>;
            default: 
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">Pending</span>;
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="w-full h-full">
                        
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Barangay Schedule</h1>
                                <p className="text-gray-500 text-sm mt-1">View official events, official absences, and facility availability.</p>
                            </div>
                            
                            <button 
                                onClick={() => navigate('/reservations/request')}
                                className="bg-[#1c4ed8] hover:bg-blue-800 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
                            >
                                + Request a Reservation
                            </button>
                        </div>

                        <div className="mb-8">
                            <BarangayCalendar />
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-xl font-bold mb-4">My Reservation Requests</h2>
                            
                            {isLoading ? (
                                <p className="text-gray-500 text-sm">Loading your requests...</p>
                            ) : myReservations.length === 0 ? (
                                <p className="text-gray-500 text-sm">You have not made any reservation requests yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 border-b">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-gray-600">ID</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Purpose</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">Start Time</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600">End Time</th>
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-center">Status</th>
                                                {/* NEW: Action column */}
                                                <th className="px-4 py-3 font-semibold text-gray-600 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {myReservations.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-500">#{req.id}</td>
                                                    <td className="px-4 py-3 font-medium">{req.purpose}</td>
                                                    <td className="px-4 py-3">{new Date(req.start_time).toLocaleString()}</td>
                                                    <td className="px-4 py-3">{new Date(req.end_time).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {getStatusBadge(req.status)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {/* Only show cancel button if it's not already cancelled or rejected */}
                                                        {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                                                            <button 
                                                                onClick={() => handleCancel(req.id)}
                                                                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded border border-transparent hover:border-red-200 transition-colors"
                                                            >
                                                                Cancel
                                                            </button>
                                                        )}
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
        </div>
    );
}