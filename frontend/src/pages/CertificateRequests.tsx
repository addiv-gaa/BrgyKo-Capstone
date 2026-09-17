import { useState, useEffect } from "react";
import { PDFDocument, rgb } from "pdf-lib";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

interface DjangoCertificate {
    id: number;
    full_name: string;
    certificate_type: string;
    date_requested: string;
    status: string;
    date_of_birth: string;
    civil_status: string;
    purpose: string;
    contact_number: string;
}

const formatCertificateType = (type: string) => {
    const types: Record<string, string> = {
        'CLEARANCE': 'Barangay Clearance',
        'RESIDENCY': 'Certificate of Residency',
        'INDIGENCY': 'Certificate of Indigency',
        'GOOD_MORAL': 'Certificate of Good Moral Character',
        'LOW_INCOME': 'Certificate of Low Income',
        'SOLO_PARENT': 'Solo Parent Certification',
        'JOB_SEEKER': 'First Time Job Seeker Certification',
    };
    return types[type] || type;
};

const getStatusBadgeClasses = (status: string) => {
    switch (status.toUpperCase()) {
        case 'PENDING':
            return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'PROCESSING':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'APPROVED':
        case 'RELEASED':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'REJECTED':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-200';
    }
}

function CertificateRequests() {
    const [requests, setRequests] = useState<DjangoCertificate[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null); 
    const [selectedRequest, setSelectedRequest] = useState<DjangoCertificate | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    
    // NEW: State for the filter tabs
    const [filter, setFilter] = useState<string>('ALL');

    useEffect(() => {
        const fetchRequests = async () => {
            const token = localStorage.getItem('access'); 
            if (!token) {
                setIsLoading(false);
                return; 
            }
            try {
                const response = await fetch(`${API_URL}/api/manager/certificates/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setRequests(data);
                    } else if (data.results) {
                        setRequests(data.results);
                    }
                }
            } catch (error) {
                console.error("Network error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequests();
    }, []);

    const handleStatusChange = async (id: number, newStatus: string) => {
        setUpdatingId(id);
        const token = localStorage.getItem('access');
        try {
            // FIXED: Added /update_status/ to the API endpoint
            const response = await fetch(`${API_URL}/api/manager/certificates/${id}/update_status/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setRequests(prevRequests => 
                    prevRequests.map(req => req.id === id ? { ...req, status: newStatus } : req)
                );
                if (selectedRequest && selectedRequest.id === id) {
                    setSelectedRequest({ ...selectedRequest, status: newStatus });
                }
            } else {
                alert("Failed to update status.");
            }
        } catch (error) {
            alert("Network error occurred.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleViewClick = (request: DjangoCertificate) => {
        setSelectedRequest(request);
        setIsModalOpen(true);
    };

    const handleGeneratePDF = async () => {
        if (!selectedRequest) return;
        setIsGenerating(true);

        try {
            const getOrdinal = (n: number) => {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
            };

            const existingPdfBytes = await fetch('/barangay_clearance.pdf').then(res => res.arrayBuffer());
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];

            const textOptions = { size: 12, color: rgb(0, 0, 0) };

            firstPage.drawText(selectedRequest.full_name, { x: 265, y: 550, ...textOptions }); 

            const today = new Date();
            const day = getOrdinal(today.getDate());
            const month = today.toLocaleString('default', { month: 'long' });
            const year = today.getFullYear().toString().slice(-2); 

            firstPage.drawText(day, { x: 130, y: 250, ...textOptions });
            firstPage.drawText(month, { x: 220, y: 250, ...textOptions });
            firstPage.drawText(year, { x: 287, y: 250, ...textOptions });

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Make sure your template is in the public folder.");
        } finally {
            setIsGenerating(false);
        }
    };

    // NEW: Filter logic for the table
    const filteredRequests = (filter === 'ALL' 
        ? [...requests] 
        : requests.filter(req => req.status.toUpperCase() === filter))
        .sort((a, b) => new Date(a.date_requested).getTime() - new Date(b.date_requested).getTime());

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800 relative">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa] text-gray-800">
                    <div className="w-full">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">Certificate Requests</h1>
                            <p className="text-gray-500 text-sm mt-1">Review, process, and print requested barangay documents.</p>
                        </div>

                        {/* Summary Analytics Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Requests</span>
                                <span className="text-2xl font-bold text-gray-900 mt-1">{requests.length}</span>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-lg shadow-sm border border-orange-200 flex flex-col">
                                <span className="text-sm font-semibold text-orange-700 uppercase tracking-wider">Pending</span>
                                <span className="text-2xl font-bold text-orange-800 mt-1">{requests.filter(r => r.status.toUpperCase() === 'PENDING').length}</span>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 flex flex-col">
                                <span className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Processing</span>
                                <span className="text-2xl font-bold text-blue-800 mt-1">{requests.filter(r => r.status.toUpperCase() === 'PROCESSING').length}</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 flex flex-col">
                                <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Released</span>
                                <span className="text-2xl font-bold text-green-800 mt-1">{requests.filter(r => r.status.toUpperCase() === 'RELEASED').length}</span>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden w-full">
                            
                            {/* Filter Tabs */}
                            <div className="flex border-b border-gray-200 bg-gray-50 px-4 overflow-x-auto">
                                {['ALL', 'PENDING', 'PROCESSING', 'RELEASED', 'REJECTED'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                            filter === status 
                                            ? 'border-blue-600 text-blue-600 bg-white' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
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
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading requests...</td></tr>
                                        ) : filteredRequests.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No requests found for this filter.</td></tr>
                                        ) : (
                                            filteredRequests.map((request) => (
                                                <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">PKO-{request.id.toString().padStart(4, '0')}</td>
                                                    <td className="px-6 py-4">{request.full_name}</td>
                                                    <td className="px-6 py-4">{formatCertificateType(request.certificate_type)}</td>
                                                    <td className="px-6 py-4">{new Date(request.date_requested).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getStatusBadgeClasses(request.status)}`}>
                                                            {request.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <select 
                                                                value={request.status.toUpperCase()}
                                                                onChange={(e) => handleStatusChange(request.id, e.target.value)}
                                                                disabled={updatingId === request.id}
                                                                className={`bg-white border border-gray-300 text-gray-700 py-1.5 px-2 rounded-md text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${updatingId === request.id ? 'opacity-50' : ''}`}
                                                            >
                                                                <option value="PENDING">Pending</option>
                                                                <option value="PROCESSING">Processing</option>
                                                                <option value="RELEASED">Released</option>
                                                                <option value="REJECTED">Rejected</option>
                                                            </select>
                                                            <button onClick={() => handleViewClick(request)} className="p-1.5 bg-white border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm" title="View Document">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal Overlay & Content */}
            {isModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Request Details</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="px-6 py-5 space-y-5 border-b border-gray-200 overflow-y-auto flex-1">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Reference Number</p>
                                <p className="font-semibold text-gray-900 text-lg">PKO-{selectedRequest.id.toString().padStart(4, '0')}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                                <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Resident Name</p><p className="font-medium text-gray-900 mt-1">{selectedRequest.full_name}</p></div>
                                <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Contact Number</p><p className="font-medium text-gray-900 mt-1">{selectedRequest.contact_number}</p></div>
                                <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date of Birth</p><p className="font-medium text-gray-900 mt-1">{selectedRequest.date_of_birth}</p></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Civil Status</p>
                                    <p className="font-medium text-gray-900 mt-1">{selectedRequest.civil_status ? selectedRequest.civil_status.charAt(0).toUpperCase() + selectedRequest.civil_status.slice(1).toLowerCase() : 'N/A'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Certificate Type</p><p className="font-medium text-gray-900 mt-1">{formatCertificateType(selectedRequest.certificate_type)}</p></div>
                                <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Date Filed</p><p className="font-medium text-gray-900 mt-1">{new Date(selectedRequest.date_requested).toLocaleDateString()}</p></div>
                            </div>
                            <div><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Purpose</p><p className="font-medium text-gray-900 mt-1 break-words">{selectedRequest.purpose}</p></div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-2">Current Status</p>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${getStatusBadgeClasses(selectedRequest.status)}`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer with the new Print Button */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors">
                                Close
                            </button>
                            <button 
                                onClick={handleGeneratePDF}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isGenerating ? "Generating..." : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                        </svg>
                                        Print Document
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CertificateRequests;