import { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

// 1. Updated shape of data to match PermitRequest model
interface DjangoPermit {
    id: number;
    applicant_name: string;
    permit_type: string;
    date_requested: string;
    status: string;
}

// 2. Updated Helper to map Permit DB values
const formatPermitType = (type: string) => {
    const types: Record<string, string> = {
        'BUSINESS': 'Business Permit',
        'CONSTRUCTION': 'Construction Permit',
        'EVENT': 'Event/Activity Permit',
        'ZONING': 'Zoning Clearance'
    };
    return types[type] || type;
};

const getStatusBadgeClasses = (status: string) => {
    switch (status.toUpperCase()) {
        case 'PENDING':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'PROCESSING':
        case 'FOR REVIEW':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'APPROVED':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'RELEASED':
            return 'bg-gray-100 text-gray-700 border-gray-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
};

function PermitRequests() {
    const [requests, setRequests] = useState<DjangoPermit[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchRequests = async () => {
            const token = localStorage.getItem('access'); 
            
            if (!token) {
                setIsLoading(false);
                return; 
            }

            try {
                // Updated to hit the permits manager endpoint
                const response = await fetch(`${API_URL}/api/manager/permits/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    if (Array.isArray(data)) {
                        setRequests(data);
                    } else if (data.results) {
                        setRequests(data.results);
                    }
                } else {
                    console.error("Failed to fetch. Status:", response.status);
                }
            } catch (error) {
                console.error("Network error:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const handleApproveClick = (id: number) => {
        setSelectedRequestId(id);
    };

    const handleConfirmApprove = async () => {
        if (!selectedRequestId) return;
        
        setIsSubmitting(true);
        const token = localStorage.getItem('access');

        try {
            // Updated endpoint for approving a permit
            const response = await fetch(`${API_URL}/api/manager/permits/${selectedRequestId}/approve/`, {
                method: 'PATCH', 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'APPROVED' })
            });

            if (response.ok) {
                setRequests(requests.map(req => 
                    req.id === selectedRequestId ? { ...req, status: 'APPROVED' } : req
                ));
                setSelectedRequestId(null); 
            } else {
                alert("Failed to approve permit.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa] text-gray-800">

                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Permit Requests</h1>
                        <p className="text-gray-500 text-sm mt-1">Review and approve pending permit requests</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto w-full">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                    <th className="px-6 py-4">Ref #</th>
                                    {/* Changed Resident to Applicant */}
                                    <th className="px-6 py-4">Applicant</th>
                                    <th className="px-6 py-4">Permit Type</th>
                                    <th className="px-6 py-4">Date Filed</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Loading requests...
                                        </td>
                                    </tr>
                                ) : requests.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No pending permit requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                                            
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                PRM-{request.id.toString().padStart(4, '0')}
                                            </td>

                                            {/* Pointing to applicant_name instead of full_name */}
                                            <td className="px-6 py-4">{request.applicant_name}</td>
                                            
                                            {/* Using new format helper */}
                                            <td className="px-6 py-4">{formatPermitType(request.permit_type)}</td>
                                            
                                            <td className="px-6 py-4">{request.date_requested}</td>

                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(request.status)}`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase()}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleApproveClick(request.id)}
                                                        disabled={request.status === 'APPROVED'}
                                                        className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        {request.status === 'APPROVED' ? 'Approved' : 'Approve'}
                                                    </button>
                                                    <button className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {selectedRequestId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                        
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                            <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        
                        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">Confirm Approval</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Are you sure you want to approve permit request <span className="font-semibold text-gray-800">PRM-{selectedRequestId.toString().padStart(4, '0')}</span>? This action will notify the applicant.
                        </p>
                        
                        <div className="flex flex-col gap-2 w-full">
                            <button 
                                onClick={handleConfirmApprove}
                                disabled={isSubmitting}
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#16a34a] text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm disabled:opacity-50"
                            >
                                {isSubmitting ? 'Approving...' : 'Yes, Approve Request'}
                            </button>
                            <button 
                                onClick={() => setSelectedRequestId(null)}
                                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PermitRequests;