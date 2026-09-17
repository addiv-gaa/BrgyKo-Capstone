import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import { AuthContext } from "../components/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface CertificateRecord {
    id: number;
    certificate_type: string;
    date_requested: string;
    status: 'PENDING' | 'PROCESSING' | 'RELEASED' | 'REJECTED';
}

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
    },
    { 
        id: 'GOOD_MORAL', 
        label: 'Certificate of Good Moral Character', 
        time: '1 business day',
        requirements: ['Valid ID', 'Recent Cedula (Community Tax Certificate)']
    },
    { 
        id: 'LOW_INCOME', 
        label: 'Certificate of Low Income', 
        time: '1 business day',
        requirements: ['Valid ID']
    },
    { 
        id: 'SOLO_PARENT', 
        label: 'Solo Parent Certification', 
        time: '1 business day',
        requirements: ['Valid ID', 'Birth Certificate of the child', 'Proof of Solo Parent status (if applicable)']
    },
    { 
        id: 'JOB_SEEKER', 
        label: 'First Time Job Seeker Certification', 
        time: '1 business day',
        requirements: ['Valid ID']
    },
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
    const navigate = useNavigate();
    const authContext = useContext(AuthContext);
    const settings = authContext?.settings;
    
    // --- State Management ---
    const [formData, setFormData] = useState({
        certificate_type: 'CLEARANCE', 
        full_name: '',
        date_of_birth: '',
        civil_status: 'SINGLE',        
        purpose: '', 
        contact_number: ''
    });

    const [requestType, setRequestType] = useState<'myself' | 'someone_else'>('myself');
    const [requestedName, setRequestedName] = useState('');
    const [requestedDob, setRequestedDob] = useState('');
    const [requestedCivilStatus, setRequestedCivilStatus] = useState('SINGLE');
    const [requestedContact, setRequestedContact] = useState('');

    const [customPurpose, setCustomPurpose] = useState('');
    const [previousRequests, setPreviousRequests] = useState<CertificateRecord[]>([]);
    
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
    const [error, setError] = useState(""); 

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Data Fetching ---
    const fetchUserProfile = async () => {
        const token = localStorage.getItem('access');
        if (!token) return;

        try {
            const response = await fetch(`${API_URL}/api/user/profile/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const profile = await response.json();
                
                // Handle Staging / Official profile states
                if (profile.approval_status === 'PENDING') {
                    setError("Your resident profile application is currently under review by barangay staff. You can request certificates once your account is approved.");
                    setIsProfileLoading(false);
                    return; 
                } else if (profile.approval_status === 'REJECTED') {
                    setError(`Your resident application was declined. Reason: ${profile.rejection_reason || 'Please contact the barangay hall for assistance.'}`);
                    setIsProfileLoading(false);
                    return; 
                } else if (profile.approval_status === 'UNCLAIMED') {
                    setError("You must claim or submit your resident profile application before you can request a certificate.");
                    setIsProfileLoading(false);
                    return;
                }
                
                setFormData(prev => ({
                    ...prev,
                    full_name: `${profile.first_name} ${profile.last_name}`,
                    date_of_birth: profile.birth_date || '',
                    civil_status: profile.civil_status ? profile.civil_status.toUpperCase() : 'SINGLE',
                    contact_number: profile.contact_number || ''
                }));
            } else if (response.status === 404) {
                setError("You must claim your resident profile before you can request a certificate.");
            }
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            setError("Failed to load your profile data.");
        } finally {
            setIsProfileLoading(false);
        }
    };

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
                    setPreviousRequests([]); 
                }
            }
        } catch (error) {
            console.error("Network error while fetching requests:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUserProfile();
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
        
        if (requestType === 'someone_else') {
            if (!requestedName.trim() || !requestedDob || !requestedContact.trim()) {
                alert("Please fill out all required details (Name, Date of Birth, Contact) for the person you are requesting this for.");
                return;
            }
        }
        
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

    // --- FIXED: Mapped perfectly to Django model ---
    const finalPayload = {
        certificate_type: formData.certificate_type,
        purpose: formData.purpose === 'Other' ? customPurpose : formData.purpose,
        
        // Use exact field names from Django: 'request_for' and 'full_name'
        request_for: requestType === 'myself' ? 'SELF' : 'OTHER',
        full_name: requestType === 'someone_else' ? requestedName : formData.full_name,
        
        date_of_birth: requestType === 'someone_else' ? requestedDob : formData.date_of_birth,
        civil_status: requestType === 'someone_else' ? requestedCivilStatus : formData.civil_status,
        contact_number: requestType === 'someone_else' ? requestedContact : formData.contact_number,
    };

    try {
        const response = await fetch(`${API_URL}/api/certificates/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(finalPayload) 
        });

            if (response.ok) {
                alert("Request submitted successfully!");
                setFormData(prev => ({
                    ...prev,
                    certificate_type: 'CLEARANCE',
                    purpose: ''
                }));
                setCustomPurpose('');
                setRequestType('myself');
                setRequestedName('');
                setRequestedDob('');
                setRequestedContact('');
                setRequestedCivilStatus('SINGLE');
                
                setIsConfirmModalOpen(false);
                fetchPreviousRequests(); 
            } 
            else if (response.status === 401) {
                alert("Your session has expired. Please log in again.");
                setIsConfirmModalOpen(false);
            } 
            else {
                alert("Failed to submit. Check the console for details.");
            }
        } catch (error) {
            console.error("Network error:", error);
            alert("Network error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const selectedCert = CERTIFICATE_TYPES.find(c => c.id === formData.certificate_type);
    const displayPurpose = formData.purpose === 'Other' ? customPurpose : formData.purpose;
    const activeTargetName = requestType === 'someone_else' ? requestedName : formData.full_name;

    // --- GLOBAL SETTING CHECK: If certificate requests are disabled by admin ---
    if (settings && !settings.accept_permit_requests) {
        return (
            <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
                <PageHeader />
                <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa] flex items-center justify-center">
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center space-y-3 max-w-lg w-full shadow-sm">
                            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">!</div>
                            <h3 className="text-lg font-bold text-amber-900">Certificate Requests Temporarily Suspended</h3>
                            <p className="text-sm text-amber-700 max-w-md mx-auto leading-relaxed">
                                Online certificate and clearance applications have been temporarily disabled by the barangay administration. Please visit the barangay hall for manual processing.
                            </p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

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
                                
                                {isProfileLoading ? (
                                    <div className="py-10 text-center text-gray-500">
                                        Fetching official records...
                                    </div>
                                ) : error ? (
                                    <div className="p-5 mb-6 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                        <p className="font-medium text-base mb-1">Action Required</p>
                                        <p>{error}</p>
                                        <button 
                                            onClick={() => navigate('/claimprofile')}
                                            className="mt-3 inline-block font-semibold text-red-800 hover:text-red-900 bg-red-100 px-4 py-2 rounded border border-red-200 transition-colors"
                                        >
                                            Go to Claim Profile page &rarr;
                                        </button>
                                    </div>
                                ) : (
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
                                                {CERTIFICATE_TYPES.map(cert => (
                                                    <option key={cert.id} value={cert.id}>{cert.label}</option>
                                                ))}
                                            </select>
                                        </div>

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

                                        {/* Who is this request for? Toggle */}
                                        <div className="pt-2">
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Who is this request for?
                                            </label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="request_type" 
                                                        checked={requestType === 'myself'} 
                                                        onChange={() => setRequestType('myself')}
                                                        className="mr-2 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-sm font-medium">For Myself</span>
                                                </label>
                                                <label className="flex items-center cursor-pointer">
                                                    <input 
                                                        type="radio" 
                                                        name="request_type" 
                                                        checked={requestType === 'someone_else'} 
                                                        onChange={() => setRequestType('someone_else')}
                                                        className="mr-2 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-sm font-medium">For Someone Else</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Dynamic Authorization Warning */}
                                        {requestType === 'someone_else' && (
                                            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                                                <div className="flex">
                                                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                    <p className="text-sm text-red-700 font-medium">
                                                        <strong>Authorization Required:</strong> You must present an <span className="underline">Authorization Letter</span> signed by the requested person and a photocopy of their Valid ID when claiming this certificate.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dynamic Name Input */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                {requestType === 'someone_else' ? "Name of Person Requested For" : "Full Name"}
                                            </label>
                                            <input 
                                                type="text" 
                                                value={requestType === 'someone_else' ? requestedName : formData.full_name}
                                                onChange={(e) => setRequestedName(e.target.value)}
                                                disabled={requestType === 'myself'}
                                                placeholder="Enter exact full name..."
                                                className={`w-full border border-gray-300 rounded-md p-2.5 outline-none ${requestType === 'myself' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-600 bg-white'}`}
                                            />
                                        </div>

                                        {/* Dynamic DOB & Civil Status */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                    Date of Birth
                                                </label>
                                                <input 
                                                    type="date" 
                                                    value={requestType === 'someone_else' ? requestedDob : formData.date_of_birth}
                                                    onChange={(e) => setRequestedDob(e.target.value)}
                                                    disabled={requestType === 'myself'} 
                                                    className={`w-full border border-gray-300 rounded-md p-2.5 outline-none ${requestType === 'myself' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-600 bg-white'}`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                    Civil Status
                                                </label>
                                                <select 
                                                    value={requestType === 'someone_else' ? requestedCivilStatus : formData.civil_status}
                                                    onChange={(e) => setRequestedCivilStatus(e.target.value)}
                                                    disabled={requestType === 'myself'} 
                                                    className={`w-full border border-gray-300 rounded-md p-2.5 outline-none ${requestType === 'myself' ? 'bg-gray-100 text-gray-500 cursor-not-allowed appearance-none' : 'focus:ring-2 focus:ring-blue-600 bg-white'}`}
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

                                        {formData.purpose === 'Other' && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                    Please Specify Purpose
                                                </label>
                                                <input 
                                                    type="text" 
                                                    value={customPurpose}
                                                    onChange={(e) => setCustomPurpose(e.target.value)}
                                                    placeholder="Type your specific purpose here..."
                                                    required
                                                    className="w-full border border-gray-300 rounded-md p-2.5 outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-400 bg-white"
                                                />
                                            </div>
                                        )}

                                        {/* Dynamic Contact Number */}
                                        <div>
                                            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                                                Contact Number
                                            </label>
                                            <input 
                                                type="text" 
                                                value={requestType === 'someone_else' ? requestedContact : formData.contact_number}
                                                onChange={(e) => setRequestedContact(e.target.value)}
                                                disabled={requestType === 'myself'} 
                                                placeholder="e.g. 09123456789"
                                                className={`w-full border border-gray-300 rounded-md p-2.5 outline-none ${requestType === 'myself' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-600 bg-white'}`}
                                            />
                                        </div>

                                        <div className="pt-2">
                                            <button 
                                                type="submit" 
                                                disabled={isSubmitting}
                                                className="w-full bg-[#1c4ed8] hover:bg-blue-800 text-white font-medium rounded-md py-3 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Submit Request
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>

                            {/* Right Column: Stacked Cards */}
                            <div className="flex flex-col gap-6">
                                
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
                            Are you sure you want to request a <span className="font-semibold text-gray-800">{selectedCert?.label}</span> for <span className="font-semibold text-gray-800">{activeTargetName}</span> with purpose: <span className="font-semibold text-gray-800">{displayPurpose}</span>? 
                        </p>
                        
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