import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../components/AuthContext"; // Import AuthContext to refresh user status

const API_URL = import.meta.env.VITE_API_URL;

const PUROK_CHOICES = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6"];
const CIVIL_STATUS_CHOICES = ["Single", "Married", "Widowed", "Legally Separated"];

export default function ClaimProfile() {
    const auth = useContext(AuthContext); // Access context to update global state
    const navigate = useNavigate();

    // Shared State
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthdate, setBirthdate] = useState("");
    
    // New Application State (Fallback)
    const [isNewApplication, setIsNewApplication] = useState(false);
    const [sex, setSex] = useState("Male");
    const [civilStatus, setCivilStatus] = useState("Single");
    const [purok, setPurok] = useState("Purok 1");
    const [contactNumber, setContactNumber] = useState("");
    
    // NEW: ID Picture state for verification
    const [idPicture, setIdPicture] = useState<File | null>(null);
    
    // UI State
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    

    // --- STEP 1: Attempt Automatic Match ---
    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        const token = localStorage.getItem('access');
        if (!token) return navigate('/login');

        try {
            const response = await fetch(`${API_URL}/api/claim-profile/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    birthdate: birthdate
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess("Success! Your profile was found and instantly linked.");
                // Refresh global user state so the app knows they are now APPROVED
                if (auth?.refreshUser) await auth.refreshUser(); 
                setTimeout(() => navigate('/'), 2000);
            } else if (response.status === 404) {
                // If not found, switch to the New Application form
                setError(data.message || "Record not found. Please fill out the rest of the form to submit a new application.");
                setIsNewApplication(true);
            } else {
                setError(data.error || data.message || "Failed to claim profile.");
            }
        } catch (err) {
            setError("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- STEP 2: Submit Brand New Application ---
    const handleSubmitNewApplication = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        
        // Ensure ID is uploaded
        if (!idPicture) {
            setError("Please upload a valid ID picture for verification.");
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('access');

        // CHANGED: Use FormData instead of JSON to support the file upload
        const formData = new FormData();
        formData.append("first_name", firstName);
        formData.append("last_name", lastName);
        formData.append("birth_date", birthdate); // Matching backend expectation
        formData.append("sex", sex);
        formData.append("civil_status", civilStatus);
        formData.append("purok", purok);
        formData.append("contact_number", contactNumber);
        formData.append("id_picture", idPicture);

        try {
            const response = await fetch(`${API_URL}/api/submit-resident-application/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Note: Do NOT set 'Content-Type' when sending FormData. The browser sets the multipart boundary automatically.
                },
                body: formData
            });

            if (response.ok) {
                setSuccess("Application submitted successfully! Please wait for the Barangay Secretary to approve it.");
                // Refresh global user state so the app knows they are now PENDING
                if (auth?.refreshUser) await auth.refreshUser(); 
                setTimeout(() => navigate('/'), 3000);
            } else {
                const data = await response.json();
                setError(data.error || "Failed to submit application. Please check your inputs.");
            }
        } catch (err) {
            setError("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className={`bg-white rounded-xl shadow-lg w-full p-8 border border-gray-200 transition-all duration-300 ${isNewApplication ? 'max-w-2xl' : 'max-w-md'}`}>
                
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNewApplication ? "New Resident Application" : "Link Your Resident Profile"}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {isNewApplication 
                            ? "We couldn't find you in the registry. Submit your details below for manual verification." 
                            : "Enter your pre-registered barangay registry details to instantly unlock your account."}
                    </p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>}

                <form onSubmit={isNewApplication ? handleSubmitNewApplication : handleClaim} className="space-y-4">
                    
                    {/* Basic Info (Always visible) */}
                    <div className={`grid gap-4 ${isNewApplication ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input 
                                type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                                disabled={isNewApplication} // Lock these so they don't change what they searched for
                                placeholder="e.g. Juan" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input 
                                type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                                disabled={isNewApplication}
                                placeholder="e.g. Dela Cruz" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>

                        <div className={isNewApplication ? "col-span-2" : ""}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                            <input 
                                type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
                                disabled={isNewApplication}
                                className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 disabled:bg-gray-100"
                            />
                        </div>
                    </div>

                    {/* Extended Info (Visible only if fallback is triggered) */}
                    {isNewApplication && (
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
                                <select value={sex} onChange={(e) => setSex(e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-600">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status</label>
                                <select value={civilStatus} onChange={(e) => setCivilStatus(e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-600">
                                    {CIVIL_STATUS_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Purok</label>
                                <select value={purok} onChange={(e) => setPurok(e.target.value)} className="w-full border border-gray-300 rounded-md p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-600">
                                    {PUROK_CHOICES.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                                <input 
                                    type="text" required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)}
                                    placeholder="09..." className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                                />
                            </div>

                            {/* NEW: File Upload for ID */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Valid ID (Image)</label>
                                <input 
                                    type="file" accept="image/*" required
                                    onChange={(e) => setIdPicture(e.target.files ? e.target.files[0] : null)}
                                    className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-600 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                                <p className="text-[11px] text-gray-500 mt-1">Provide a clear photo of a government-issued ID for verification.</p>
                            </div>
                        </div>
                    )}

                    <div className="pt-2">
                        <button 
                            type="submit" disabled={isLoading}
                            className="w-full bg-[#1c4ed8] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50"
                        >
                            {isLoading 
                                ? "Processing..." 
                                : (isNewApplication ? "Submit Application" : "Search Registry")}
                        </button>
                        
                        {isNewApplication && (
                            <button 
                                type="button" 
                                onClick={() => { setIsNewApplication(false); setError(""); }}
                                className="w-full mt-2 text-sm text-gray-500 hover:text-gray-800 py-2"
                            >
                                ← Back to Search
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}