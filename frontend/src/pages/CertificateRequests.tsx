import { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

// 1. Define the shape of data coming from Django
interface DjangoCertificate {
    id: number;
    full_name: string;
    certificate_type: string;
    date_requested: string;
    status: string;
}

// 2. Helper to map Django DB values to Human Readable text
const formatCertificateType = (type: string) => {
    const types: Record<string, string> = {
        'CLEARANCE': 'Barangay Clearance',
        'RESIDENCY': 'Certificate of Residency',
        'INDIGENCY': 'Certificate of Indigency'
    };
    return types[type] || type;
};

// 3. Helper for Status Colors
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

function CertificateRequests() {
    const [requests, setRequests] = useState<DjangoCertificate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // --- Fetch Data on Load ---
    useEffect(() => {
        const fetchRequests = async () => {
            const token = localStorage.getItem('access'); // Make sure this matches your login logic!
            
            if (!token) {
                setIsLoading(false);
                return; // Optionally redirect to login here
            }

            try {
                // Hitting the new MANAGER endpoint
                const response = await fetch(`${API_URL}/api/manager/certificates/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Handle potential pagination from Django
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

    // --- Action Handlers (For later implementation) ---
    const handleApprove = (id: number) => {
        // You will eventually add a PATCH request here to update the status to 'APPROVED'
        console.log(`Approve clicked for ID: ${id}`);
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa] text-gray-800">

                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Certificate Requests</h1>
                        <p className="text-gray-500 text-sm mt-1">Review and approve pending requests</p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto w-full">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/50 text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                    <th className="px-6 py-4">Ref #</th>
                                    <th className="px-6 py-4">Resident</th>
                                    <th className="px-6 py-4">Type</th>
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
                                            No pending certificate requests found.
                                        </td>
                                    </tr>
                                ) : (
                                    requests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                                            
                                            {/* Ref # mapped dynamically */}
                                            <td className="px-6 py-4 font-bold text-gray-900">
                                                PKO-{request.id.toString().padStart(4, '0')}
                                            </td>

                                            <td className="px-6 py-4">{request.full_name}</td>
                                            
                                            <td className="px-6 py-4">{formatCertificateType(request.certificate_type)}</td>
                                            
                                            <td className="px-6 py-4">{request.date_requested}</td>

                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClasses(request.status)}`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1).toLowerCase()}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => handleApprove(request.id)}
                                                        className="flex items-center gap-1.5 bg-[#16a34a] hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                        Approve
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
        </div>
    );
}

export default CertificateRequests;