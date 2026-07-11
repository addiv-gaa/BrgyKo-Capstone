import React, { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

// 1. Define the shape of your API data for TypeScript
interface PermitRecord {
    id: number;
    permit_type: string;
    date_requested: string;
    status: 'PENDING' | 'PROCESSING' | 'RELEASED' | 'REJECTED';
}

export default function RequestPermit() {
    // --- State Management ---
    const [formData, setFormData] = useState({
        permit_type: 'BUSINESS', 
        applicant_name: '',
        address: '',
        date_needed: '',
        nature: '',        
        supporting_documents: ''
    });

    // State for the previous requests table
    const [previousRequests, setPreviousRequests] = useState<PermitRecord[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

// --- Data Fetching (Runs once on component mount) ---
    useEffect(() => {
        const fetchPreviousRequests = async () => {
            // FIX 1: Make sure this exactly matches the key in your handleSubmit
            const token = localStorage.getItem('access'); 
            
            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`${API_URL}/api/permits/`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // FIX 2: Check if Django paginated the response
                    if (Array.isArray(data)) {
                        // If it's a standard array, set it directly
                        setPreviousRequests(data);
                    } else if (data.results && Array.isArray(data.results)) {
                        // If Django wrapped it in a 'results' object, drill down into it
                        setPreviousRequests(data.results);
                    } else {
                        console.error("API returned an unexpected format:", data);
                        setPreviousRequests([]); // Fallback to prevent crashes
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); 

        const token = localStorage.getItem('access');

        if (!token) {
            alert("You must be logged in to submit a request.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/permits/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(formData) 
            });

            if (response.ok) {
                alert("Request submitted successfully!");
                // Clear the form
                setFormData({
                    permit_type: 'BUSINESS',
                    applicant_name: '',
                    address: '',
                    date_needed: '',
                    nature: '',
                    supporting_documents: ''
                });
                
                // Optional: You could trigger a re-fetch here to instantly show the new request in the table
                // fetchPreviousRequests(); 
            } 
            else if (response.status === 401) {
                console.error("Authentication failed: Token missing or expired.");
                alert("Your session has expired. Please log in again.");
            } 
            else {
                const errorData = await response.json();
                console.error("Validation errors from Django:", errorData);
                alert("Failed to submit. Check the console for details.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
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

    // --- Render ---
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Request a Permit</h1>
                            <p className="text-gray-500 text-sm mt-1">Apply for Barangay-level permits</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Form Column */}
                            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                <h2 className="text-lg font-bold mb-6">Permit Request Form</h2>
                                
                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Permit Type
                                        </label>
                                        <select 
                                            name="permit_type"
                                            value={formData.permit_type}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                        >
                                            <option value="BUSINESS">Business Permit</option>
                                            <option value="CONSTRUCTION">Construction Permit</option>
                                            <option value="EVENT">Event/Activity Permit</option>
                                            <option value="ZONING">Zoning Clearance</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Applicant / Business Name
                                        </label>
                                        <input 
                                            type="text" 
                                            name="applicant_name"
                                            value={formData.applicant_name}
                                            onChange={handleChange}
                                            placeholder="Enter your full name" 
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Address
                                        </label>
                                        <input 
                                            type="text" 
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="Enter your address" 
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Date Needed
                                            </label>
                                            <input 
                                                type="date" 
                                                name="date_needed"
                                                value={formData.date_needed}
                                                onChange={handleChange}
                                                required
                                                className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 text-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Nature
                                            </label>
                                            <input 
                                            type="text" 
                                            name="nature"
                                            value={formData.nature}
                                            onChange={handleChange}
                                            placeholder="Enter the nature of the request" 
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400"
                                        />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Supporting Documents
                                        </label>
                                        <input 
                                            type="text" 
                                            name="supporting_documents"
                                            value={formData.supporting_documents}
                                            onChange={handleChange}
                                            placeholder="List required documents" 
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
                                                            {/* Assuming the API returns human-readable types. If not, map them similarly to statuses. */}
                                                            <td className="py-4">{request.permit_type}</td>
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
                                    <h2 className="text-sm font-bold mb-2">Processing Fee</h2>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                        Processing fee: ₱50 for most permits. Present official receipt upon pickup. <span className="font-bold text-gray-800">1–2 business days</span>. You will receive an SMS when your certificate is ready for pickup.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
