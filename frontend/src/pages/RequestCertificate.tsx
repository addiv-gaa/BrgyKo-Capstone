import React, { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

interface CertificateRecord {
    id: number;
    certificate_type: string;
    date_requested: string;
    status: 'PENDING' | 'PROCESSING' | 'RELEASED' | 'REJECTED';
}

// NEW: Static data for dropdowns, requirements, and processing times
const CERTIFICATE_TYPES = [
    { 
        id: 'CLEARANCE', 
        label: 'Barangay Clearance', 
        time: '1-2 business days',
        requirements: ['Valid ID (e.g., Passport, Driver\'s License)', 'Recent Cedula (Community Tax Certificate)']
    },
    { 
        id: 'RESIDENCY', 
        label: 'Certificate of Residency', 
        time: '1 business day',
        requirements: ['Valid ID', 'Proof of Billing matching the resident address']
    },
    { 
        id: 'INDIGENCY', 
        label: 'Certificate of Indigency', 
        time: '1 business day',
        requirements: ['Valid ID']
    }
];

const PURPOSES = [
    'Employment',
    'Bank Requirement',
    'School Requirement',
    'Government ID Application',
    'Financial Assistance',
    'Other'
];

export default function RequestCertificate() {
    // --- State Management ---
    const [formData, setFormData] = useState({
        certificate_type: 'CLEARANCE', 
        full_name: '',
        date_of_birth: '',
        civil_status: 'SINGLE',        
        purpose: '', // This will now start empty to force dropdown selection
        contact_number: ''
    });

    const [previousRequests, setPreviousRequests] = useState<CertificateRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching (Runs once on component mount) ---
    const fetchPreviousRequests = async () => {
        const token = localStorage.getItem('access'); 
        
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/certificates/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                if (Array.isArray(data)) {
                    setPreviousRequests(data);
                } else if (data.results && Array.isArray(data.results)) {
                    setPreviousRequests(data.results);
                } else {
                    console.error("API returned an unexpected format:", data);
                    setPreviousRequests([]); 
                }
            } else {
                console.error("Failed to fetch previous requests. Status:", response.status);
            }
        } catch (error) {
            console.error("Network error while fetching requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPreviousRequests();
    }, []);

    // --- Event Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleInitialSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 
        setIsConfirmModalOpen(true);
    };

    const handleFinalConfirm = async () => {
        const token = localStorage.getItem('access');

        if (!token) {
            alert("You must be logged in to submit a request.");
            setIsConfirmModalOpen(false);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_URL}/api/certificates/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData) 
            });

            if (response.ok) {
                alert("Request submitted successfully!");
                setFormData({
                    certificate_type: 'CLEARANCE',
                    full_name: '',
                    date_of_birth: '',
                    civil_status: 'SINGLE',
                    purpose: '',
                    contact_number: ''
                });
                
                setIsConfirmModalOpen(false);
                fetchPreviousRequests(); 
            } 
            else if (response.status === 401) {
                console.error("Authentication failed: Token missing or expired.");
                alert("Your session has expired. Please log in again.");
                setIsConfirmModalOpen(false);
            } 
            else {
                const errorData = await response.json();
                console.error("Validation errors from Django:", errorData);
                alert("Failed to submit. Check the console for details.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Helper Functions ---
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'RELEASED':
                return <span className="px-2.5 py-1 bg-[#edf7ed] text-[#2e7d32] text-xs font-medium rounded-md border border-green-200">Released</span>;
            case 'PENDING':
                return <span className="px-2.5 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-md border border-yellow-200">Pending</span>;
            case 'PROCESSING':
                return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-200">Processing</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-md border border-red-200">Rejected</span>;
            default:
                return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-medium rounded-md border border-gray-200">{status}</span>;
        }
    };

    // NEW: Find active certificate config for dynamic display
    const selectedCert = CERTIFICATE_TYPES.find(c => c.id === formData.certificate_type);

    // --- Render ---
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Request a Certificate</h1>
                            <p className="text-gray-500 text-sm mt-1">Submit a barangay certificate request online</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Form Column */}
                            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-bold mb-6">Certificate Request Form</h2>
                                
                                <form className="space-y-5" onSubmit={handleInitialSubmit}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Certificate Type
                                        </label>
                                        <select 
                                            name="certificate_type"
                                            value={formData.certificate_type}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                        >
                                            {/* NEW: Map through the array instead of hardcoding */}
                                            {CERTIFICATE_TYPES.map(cert => (
                                                <option key={cert.id} value={cert.id}>{cert.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* NEW: Dynamic Requirements Box */}
                                    {selectedCert && selectedCert.requirements.length > 0 && (
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r mt-2">
                                            <h4 className="font-semibold text-blue-800 text-xs uppercase tracking-wider mb-2">
                                                Required Documents for {selectedCert.label}
                                            </h4>
                                            <ul className="list-disc pl-5 text-sm text-blue-900 space-y-1">
                                                {selectedCert.requirements.map((req, index) => (
                                                    <li key={index}>{req}</li>
                                                ))}
                                            </ul>
                                            <p className="text-xs text-blue-700 mt-3 italic">
                                                * Please bring these documents when claiming your certificate at the barangay hall.
                                            </p>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Full Name
                                        </label>
                                        <input 
                                            type="text" 
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            placeholder="Enter your full name" 
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Date of Birth
                                            </label>
                                            <input 
                                                type="date" 
                                                name="date_of_birth"
                                                value={formData.date_of_birth}
                                                onChange={handleChange}
                                                required
                                                className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 text-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Civil Status
                                            </label>
                                            <select 
                                                name="civil_status"
                                                value={formData.civil_status}
                                                onChange={handleChange}
                                                className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                            >
                                                <option value="SINGLE">Single</option>
                                                <option value="MARRIED">Married</option>
                                                <option value="WIDOWED">Widowed</option>
                                                <option value="SEPARATED">Legally Separated</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Purpose
                                        </label>
                                        {/* NEW: Converted from text input to select dropdown */}
                                        <select 
                                            name="purpose"
                                            value={formData.purpose}
                                            onChange={handleChange}
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                        >
                                            <option value="" disabled>Select a purpose...</option>
                                            {PURPOSES.map((purpose, index) => (
                                                <option key={index} value={purpose}>{purpose}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Contact Number
                                        </label>
                                        <input 
                                            type="text" 
                                            name="contact_number"
                                            value={formData.contact_number}
                                            onChange={handleChange}
                                            placeholder="09XX-XXX-XXXX" 
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            type="submit" 
                                            className="w-full bg-[#1c4ed8] hover:bg-blue-800 text-white font-medium rounded-md py-3 flex items-center justify-center transition-colors"
                                        >
                                            Submit Request
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: Stacked Cards */}
                            <div className="flex flex-col gap-6">
                                
                                {/* Dynamic Previous Requests Table */}
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                    <h2 className="text-sm font-bold mb-4">My Previous Requests</h2>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                                                    <th className="pb-3 font-semibold">Type</th>
                                                    <th className="pb-3 font-semibold text-center">Date</th>
                                                    <th className="pb-3 font-semibold text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                                {isLoading ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-6 text-center text-gray-500">Loading requests...</td>
                                                    </tr>
                                                ) : previousRequests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="py-6 text-center text-gray-500">No previous requests found.</td>
                                                    </tr>
                                                ) : (
                                                    previousRequests.map((request) => (
                                                        <tr key={request.id}>
                                                            <td className="py-4 font-medium">{CERTIFICATE_TYPES.find(c => c.id === request.certificate_type)?.label || request.certificate_type}</td>
                                                            <td className="py-4 text-center">{request.date_requested}</td>
                                                            <td className="py-4 text-center">
                                                                {renderStatusBadge(request.status)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Processing Time Info Box */}
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                    <h2 className="text-sm font-bold mb-2">General Processing</h2>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Requests are verified by the barangay staff.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* The Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
                        
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 mb-4">
                            <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Submission</h3>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            Are you sure you want to request a <span className="font-semibold text-gray-800">{selectedCert?.label}</span> for <span className="font-semibold text-gray-800">{formData.full_name}</span>? 
                        </p>
                        
                        {/* NEW: Dynamic Processing Time Alert */}
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md mb-6 text-left">
                            <p className="text-sm text-yellow-800">
                                <span className="font-semibold">Estimated Processing:</span> {selectedCert?.time}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <button 
                                onClick={handleFinalConfirm}
                                disabled={isSubmitting}
                                className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#1c4ed8] text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Submitting...
                                    </>
                                ) : 'Yes, Submit Request'}
                            </button>
                            <button 
                                onClick={() => setIsConfirmModalOpen(false)}
                                disabled={isSubmitting}
                                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            >
                                Wait, go back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}