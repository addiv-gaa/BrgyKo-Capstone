import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import api from "../api";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

interface ResidentProfile {
    first_name: string;
    last_name: string;
    birth_date: string;
    civil_status: string;
    sex: string;
    contact_number: string;
    purok: string;
    approval_status: string;
}

export default function Profile() {
    const navigate = useNavigate(); 
    
    const [profile, setProfile] = useState<ResidentProfile | null>(null);
    const [contactNumber, setContactNumber] = useState("");
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // States for the Profile Correction Modal
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [correctionData, setCorrectionData] = useState({
        requested_first_name: "",
        requested_last_name: "",
        requested_birth_date: "",
        requested_civil_status: "SINGLE", 
        reason: ""
    });
    const [submittingCorrection, setSubmittingCorrection] = useState(false);
    const [correctionMessage, setCorrectionMessage] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/user/profile/');
                setProfile(res.data);
                setContactNumber(res.data.contact_number || "");
                
                // Pre-populate modal fields with current values for convenience
                setCorrectionData({
                    requested_first_name: res.data.first_name || "",
                    requested_last_name: res.data.last_name || "",
                    requested_birth_date: res.data.birth_date || "",
                    requested_civil_status: res.data.civil_status ? res.data.civil_status.toUpperCase() : "SINGLE",
                    reason: ""
                });
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setError("You have not claimed a resident profile yet. Please complete the claim process.");
                } else {
                    setError("Failed to load profile data.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");

        try {
            const res = await api.patch('/api/user/profile/', { contact_number: contactNumber });
            setProfile(res.data);
            setMessage("Contact information updated successfully!");
        } catch (err) {
            setMessage("Failed to update profile.");
        } finally {
            setSaving(false);
        }
    };

    // Handle submission for online profile correction requests
    const handleCorrectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingCorrection(true);
        setCorrectionMessage("");

        try {
            await api.post('/api/user/profile-update-request/', correctionData);
            setCorrectionMessage("Correction request submitted successfully! Barangay staff will review it shortly.");
            setTimeout(() => {
                setIsCorrectionModalOpen(false);
                setCorrectionMessage("");
            }, 2000);
        } catch (err) {
            setCorrectionMessage("Failed to submit correction request. Please try again.");
        } finally {
            setSubmittingCorrection(false);
        }
    };

    // NEW: Handle unlinking a rejected profile claim
    const handleResetClaim = async () => {
        try {
            await api.post('/api/user/reset-claim/');
            window.location.reload(); // Reload to trigger the 404 and show the Claim button
        } catch (err) {
            alert("Failed to reset claim. Please try again.");
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'APPROVED') return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">Verified Resident</span>;
        if (status === 'PENDING') return <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold border border-orange-200">Verification Pending</span>;
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-200">Claim Rejected</span>;
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-8">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">My Resident Profile</h1>
                                <p className="text-gray-500 text-sm">View your official barangay records and manage contact details.</p>
                            </div>
                            {profile && getStatusBadge(profile.approval_status)}
                        </div>

                        {error ? (
                            <div className="p-5 bg-red-50 border border-red-200 text-red-700 rounded-md">
                                <p className="font-medium text-base mb-1">Action Required</p>
                                <p className="text-sm mb-3">{error}</p>
                                {error.includes("claim") && (
                                    <button 
                                        onClick={() => navigate('/claimprofile')}
                                        className="inline-block font-semibold text-red-800 hover:text-red-900 bg-red-100 px-4 py-2 rounded border border-red-200 transition-colors text-sm"
                                    >
                                        Go to Claim Profile page &rarr;
                                    </button>
                                )}
                            </div>
                        ) : loading ? (
                            <p className="text-gray-500 text-center py-8">Loading profile...</p>
                        ) : profile && profile.approval_status === 'REJECTED' ? (
                            /* CHANGED: Security Block for Rejected Profiles */
                            <div className="p-8 bg-red-50 border border-red-200 rounded-lg text-center">
                                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <h3 className="text-xl font-bold text-red-800 mb-2">Verification Claim Rejected</h3>
                                <p className="text-sm text-red-700 mb-6 max-w-md mx-auto">
                                    Your request to link this profile was declined by barangay staff. To protect resident privacy, the official records have been hidden.
                                </p>
                                <button 
                                    onClick={handleResetClaim}
                                    className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    Unlink & Submit a New Claim
                                </button>
                            </div>
                        ) : profile ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {message && (
                                    <div className={`p-3 rounded-md text-sm font-medium ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {message}
                                    </div>
                                )}

                                {/* OFFICIAL RECORDS SECTION (Read-Only) */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 text-blue-600">Official Records (Read-Only)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                                        
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase">First Name</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.first_name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 uppercase">Last Name</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.last_name}</p>
                                        </div>
                                        
                                        <div className="pt-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.birth_date}</p>
                                        </div>
                                        <div className="pt-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase">Sex</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.sex}</p>
                                        </div>

                                        <div className="pt-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase">Civil Status</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.civil_status}</p>
                                        </div>
                                        <div className="pt-2">
                                            <label className="block text-xs font-medium text-gray-500 uppercase">Purok</label>
                                            <p className="mt-1 text-base font-semibold text-gray-900">{profile.purok}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Accessible online correction trigger */}
                                    <div className="mt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <p className="text-xs text-gray-400 italic">Need to correct your official records? You can request updates online.</p>
                                        <button 
                                            type="button"
                                            onClick={() => setIsCorrectionModalOpen(true)}
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded border border-blue-200 transition-colors"
                                        >
                                            Request Profile Correction Online
                                        </button>
                                    </div>
                                </div>

                                {/* EDITABLE SECTION */}
                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 text-blue-600">Contact Information</h3>
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700">Active Mobile Number</label>
                                        <input 
                                            type="text" 
                                            value={contactNumber} 
                                            onChange={(e) => setContactNumber(e.target.value)} 
                                            placeholder="e.g. 09123456789" 
                                            className="mt-1 block w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-gray-800 focus:outline-blue-600 focus:ring-blue-600 shadow-sm" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm">
                                        {saving ? "Saving..." : "Update Contact Info"}
                                    </button>
                                </div>
                            </form>
                        ) : null}
                    </div>
                </main>
            </div>

            {/* PROFILE CORRECTION MODAL */}
            {isCorrectionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Request Profile Correction</h3>
                            <button onClick={() => setIsCorrectionModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCorrectionSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Submit changes for official review. This is especially designed for homebound residents, seniors, and PWDs who cannot visit the barangay hall in person.
                            </p>

                            {correctionMessage && (
                                <div className={`p-3 rounded-md text-sm font-medium ${correctionMessage.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                    {correctionMessage}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase">New First Name</label>
                                    <input 
                                        type="text" 
                                        value={correctionData.requested_first_name} 
                                        onChange={(e) => setCorrectionData({...correctionData, requested_first_name: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-blue-600 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase">New Last Name</label>
                                    <input 
                                        type="text" 
                                        value={correctionData.requested_last_name} 
                                        onChange={(e) => setCorrectionData({...correctionData, requested_last_name: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-blue-600 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase">New Birth Date</label>
                                    <input 
                                        type="date" 
                                        value={correctionData.requested_birth_date} 
                                        onChange={(e) => setCorrectionData({...correctionData, requested_birth_date: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-blue-600 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 uppercase">New Civil Status</label>
                                    <select 
                                        value={correctionData.requested_civil_status} 
                                        onChange={(e) => setCorrectionData({...correctionData, requested_civil_status: e.target.value})}
                                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-blue-600 bg-white"
                                    >
                                        <option value="SINGLE">Single</option>
                                        <option value="MARRIED">Married</option>
                                        <option value="WIDOWED">Widowed</option>
                                        <option value="SEPARATED">Legally Separated</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 uppercase">Reason for Update / Accessibility Note</label>
                                <textarea 
                                    rows={3}
                                    value={correctionData.reason} 
                                    onChange={(e) => setCorrectionData({...correctionData, reason: e.target.value})}
                                    placeholder="e.g., Typo in registry name, unable to travel due to disability..."
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-blue-600 bg-white"
                                />
                            </div>

                            <div className="pt-4 border-t flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsCorrectionModalOpen(false)}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submittingCorrection}
                                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                    {submittingCorrection ? "Submitting..." : "Submit Request"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}