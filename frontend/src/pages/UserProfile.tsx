import { useState, useEffect } from "react";
import api from "../api";

interface ResidentProfile {
    first_name?: string;
    last_name?: string;
    birth_date?: string;
    civil_status?: string;
    sex?: string;
    contact_number?: string;
    purok?: string;
    approval_status: string;
}

export default function Profile() {
    const [profile, setProfile] = useState<ResidentProfile | null>(null);
    const [contactNumber, setContactNumber] = useState("");
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/user/profile/');
                const data = res.data;
                setProfile(data);
                setContactNumber(data.contact_number || "");
            } catch (err: any) {
                if (err.response?.status === 404) {
                    setProfile({ approval_status: 'UNLINKED' });
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

    const isVerifiedResident = profile?.approval_status === 'APPROVED' && profile.first_name;

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 w-full overflow-y-auto p-4 sm:p-8 bg-[#f4f7fa]">
                    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">My Profile</h1>
                                <p className="text-gray-500 text-sm">View official barangay records and manage contact details.</p>
                            </div>
                            {isVerifiedResident ? (
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold border border-green-200">
                                    Verified Resident
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold border border-gray-200">
                                    Account Active
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <p className="text-gray-500 text-center py-8">Loading profile...</p>
                        ) : error ? (
                            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                                {error}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {message && (
                                    <div className={`p-3 rounded-md text-sm font-medium ${message.includes("success") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                        {message}
                                    </div>
                                )}

                                {isVerifiedResident ? (
                                    /* VERIFIED OFFICIAL RECORDS */
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Official Barangay Records</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 uppercase">Full Name</label>
                                                    <p className="mt-1 text-base font-semibold text-gray-900">{profile.first_name} {profile.last_name}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 uppercase">Date of Birth</label>
                                                    <p className="mt-1 text-base font-semibold text-gray-900">{profile.birth_date || "—"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 uppercase">Sex</label>
                                                    <p className="mt-1 text-base font-semibold text-gray-900">{profile.sex || "—"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 uppercase">Civil Status</label>
                                                    <p className="mt-1 text-base font-semibold text-gray-900">{profile.civil_status || "—"}</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 uppercase">Purok</label>
                                                    <p className="mt-1 text-base font-semibold text-gray-900">{profile.purok || "—"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-gray-500 italic">
                                            Need to correct official registry details? Please coordinate in-person with the Barangay Secretary at the Barangay Hall.
                                        </p>
                                    </div>
                                ) : (
                                    /* UNLINKED INFO NOTICE */
                                    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-blue-100 text-blue-700 rounded-full shrink-0 mt-0.5">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-blue-900 text-base mb-1">Resident Registry Notice</h3>
                                                <p className="text-sm text-blue-800 leading-relaxed">
                                                    Your online account is not currently linked to an official resident record in the Barangay registry.
                                                    If you are a resident of the barangay, please visit the Barangay Hall so the Barangay Secretary can link your account to your registry record.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CONTACT INFORMATION SECTION */}
                                <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-200 space-y-4">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider text-green-700">Contact Information</h3>
                                    <div className="max-w-md">
                                        <label className="block text-sm font-medium text-gray-700">Active Mobile Number</label>
                                        <input 
                                            type="text" 
                                            value={contactNumber} 
                                            onChange={(e) => setContactNumber(e.target.value)} 
                                            placeholder="e.g. 09123456789" 
                                            className="mt-1 block w-full rounded-md bg-white border border-gray-300 px-3 py-2 text-gray-800 focus:outline-green-600 focus:ring-green-600 shadow-sm" 
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={saving} 
                                            className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {saving ? "Saving..." : "Update Contact Info"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
