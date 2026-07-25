import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const PUROK_CHOICES = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6"];
const CIVIL_STATUS_CHOICES = ["Single", "Married", "Widowed", "Legally Separated"];

export default function ClaimProfile() {
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
    
    // UI State
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

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
                setTimeout(() => navigate('/dashboard'), 2000);
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
        setIsLoading(true);

        const token = localStorage.getItem('access');

        try {
            const response = await fetch(`${API_URL}/api/submit-resident-application/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    birth_date: birthdate, // Note: Django model expects birth_date
                    sex,
                    civil_status: civilStatus,
                    purok,
                    contact_number: contactNumber
                })
            });

            if (response.ok) {
                setSuccess("Application submitted successfully! Please wait for the Barangay Secretary to approve it.");
                setTimeout(() => navigate('/dashboard'), 3000);
            } else {
                setError("Failed to submit application. Please check your inputs.");
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