import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
const API_URL = import.meta.env.VITE_API_URL;

// UPDATED INTERFACE: Matched fields to Django model
interface IncidentRecord {
    id: number;
    category: string;
    location_details: string; 
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED'; 
    created_at: string; 
}

const INCIDENT_CATEGORIES = [
    { id: 'DISTURBANCE', label: 'Noise / Disturbance' },
    { id: 'INFRASTRUCTURE', label: 'Broken Infrastructure (Lights, Roads)' },
    { id: 'CLEANLINESS', label: 'Garbage / Cleanliness' },
    { id: 'SECURITY', label: 'Theft / Security Issue' },
    { id: 'EMERGENCY', label: 'Health / Fire Emergency' },
    { id: 'OTHER', label: 'Other' }
];

export default function ReportIncident() {
    const navigate = useNavigate();
    
    // --- State Management ---
    const [formData, setFormData] = useState({
        category: 'DISTURBANCE',
        location: '',
        description: ''
    });
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    
    const [previousReports, setPreviousReports] = useState<IncidentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // --- Data Fetching ---
    const fetchPreviousReports = async () => {
        const token = localStorage.getItem('access');
        if (!token) return navigate('/login');

        try {
            const response = await fetch(`${API_URL}/api/incident-reports/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                    setPreviousReports(data);
                } else if (data.results && Array.isArray(data.results)) {
                    setPreviousReports(data.results);
                }
            }
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPreviousReports();
    }, []);

    // --- Event Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // NEW: File Size Validation Added Here
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Limit file size to 5MB (5 * 1024 * 1024 bytes)
            if (file.size > 5242880) {
                alert("File is too large! Please select an image under 5MB.");
                e.target.value = ''; // Reset the input field
                return;
            }
            
            setPhotoFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsSubmitting(true);

        const token = localStorage.getItem('access');
        if (!token) {
            setError("Authentication required.");
            setIsSubmitting(false);
            return;
        }

        // Use FormData to handle text + file payload
        const payload = new FormData();
        payload.append('category', formData.category);
        payload.append('location_details', formData.location);
        payload.append('description', formData.description);
        
        if (photoFile) {
            payload.append('photo_attachment', photoFile); 
        }

        try {
            const response = await fetch(`${API_URL}/api/incident-reports/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: payload
            });

            if (response.ok) {
                setSuccess("Incident reported successfully! The barangay tanods have been notified.");
                setFormData({ category: 'DISTURBANCE', location: '', description: '' });
                setPhotoFile(null);
                
                const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
                
                fetchPreviousReports();
            } else {
                const errorData = await response.json();
                console.error("DJANGO VALIDATION ERROR:", errorData);
                
                if (response.status === 429) {
                    setError("You are submitting reports too quickly. Please wait a moment.");
                } else if (typeof errorData === 'object' && errorData !== null) {
                    const errorMessages = Object.entries(errorData)
                        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(' ') : msgs}`)
                        .join(' | ');
                    setError(errorMessages || "Failed to submit report.");
                } else {
                    setError("Failed to submit report. Please check your inputs.");
                }
            }
        } catch (err) {
            setError("A network error occurred. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Helper Functions ---
    // UPDATED: Sync'd badges with backend statuses
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'RESOLVED':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded-md border border-green-200">Resolved</span>;
            case 'INVESTIGATING':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase rounded-md border border-green-200">Investigating</span>;
            case 'PENDING':
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase rounded-md border border-yellow-200">Pending</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-[10px] font-bold uppercase rounded-md border border-gray-200">Rejected</span>;
            default:
                return <span className="px-2 py-1 bg-gray-50 text-gray-700 text-[10px] font-bold uppercase rounded-md border border-gray-200">{status}</span>;
        }
    };

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            

            <div className="flex flex-1 overflow-hidden">
                

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Report an Incident</h1>
                            <p className="text-gray-500 text-sm mt-1">Notify barangay officials of emergencies, hazards, or disturbances.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Left Column: Form */}
                            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="bg-red-100 p-2 rounded-full">
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold">New Incident Report</h2>
                                </div>

                                {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
                                {success && <div className="mb-5 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>}

                                <form className="space-y-5" onSubmit={handleSubmit}>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Incident Category
                                        </label>
                                        <select 
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-green-600 bg-white"
                                        >
                                            {INCIDENT_CATEGORIES.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Exact Location
                                        </label>
                                        <input 
                                            type="text" 
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            placeholder="e.g., Corner of Rizal St. and Mabini St. near the bakery"
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-green-600 bg-white text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Description of the Incident
                                        </label>
                                        <textarea 
                                            name="description"
                                            value={formData.description}
                                            onChange={handleChange}
                                            rows={4}
                                            placeholder="Please describe what happened, who is involved, and any immediate hazards..."
                                            required
                                            className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-green-600 bg-white text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                            Upload Photo / Evidence (Optional)
                                        </label>
                                        <input 
                                            id="photo-upload"
                                            type="file" 
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 border border-gray-300 rounded-md p-1 bg-white"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">Maximum file size is 5MB. Adding a photo helps tanods quickly assess the situation.</p>
                                    </div>

                                    <div className="pt-2">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmitting}
                                            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium rounded-md py-3 transition-colors disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Submitting Report..." : "Submit Incident Report"}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Right Column: History */}
                            <div className="flex flex-col gap-6">
                                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                    <h2 className="text-sm font-bold mb-4">My Submitted Reports</h2>
                                    
                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                        {isLoading ? (
                                            <p className="text-center text-xs text-gray-500 py-4">Loading history...</p>
                                        ) : previousReports.length === 0 ? (
                                            <p className="text-center text-xs text-gray-500 py-4">You haven't reported any incidents yet.</p>
                                        ) : (
                                            previousReports.map((report) => (
                                                <div key={report.id} className="border border-gray-100 rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="font-semibold text-xs text-gray-800">
                                                            {INCIDENT_CATEGORIES.find(c => c.id === report.category)?.label || report.category}
                                                        </span>
                                                        {renderStatusBadge(report.status)}
                                                    </div>
                                                    <p className="text-[11px] text-gray-500 truncate mb-1">
                                                        <span className="font-semibold mr-1">Loc:</span>{report.location_details}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400">
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-5 text-center">
                                    <h3 className="text-sm font-bold text-red-800 mb-2">In Case of Emergency</h3>
                                    <p className="text-xs text-red-700 leading-relaxed mb-3">
                                        If there is an immediate threat to life or property, please do not wait. Call the local authorities directly.
                                    </p>
                                    <p className="font-bold text-lg text-red-600 tracking-wider">911</p>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}