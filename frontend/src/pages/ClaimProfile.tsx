import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function ClaimProfile() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthdate, setBirthdate] = useState("");
    const [idFile, setIdFile] = useState<File | null>(null); // NEW: State for ID upload file
    
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setIsLoading(true);

        const token = localStorage.getItem('access');
        if (!token) {
            navigate('/login');
            return;
        }

        // Use FormData to send text fields and the image file securely together
        const formData = new FormData();
        formData.append("first_name", firstName);
        formData.append("last_name", lastName);
        formData.append("birthdate", birthdate);
        
        if (idFile) {
            formData.append("id_picture", idFile);
        }

        try {
            const response = await fetch(`${API_URL}/api/claim-profile/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Note: Do NOT set 'Content-Type': 'application/json' when using FormData. 
                    // The browser will automatically assign the multipart boundary.
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                setTimeout(() => {
                    navigate('/dashboard'); 
                }, 2000);
            } else {
                setError(data.error || "Failed to claim profile.");
            }
        } catch (err) {
            console.error("Network error:", err);
            setError("A network error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 border border-gray-200">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Link Your Resident Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">Enter your pre-registered barangay registry details and upload a valid ID to unlock document requests.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>}

                <form onSubmit={handleClaim} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input 
                            type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. Juan" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input 
                            type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Dela Cruz" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                        <input 
                            type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                        />
                    </div>

                    {/* NEW: Upload ID Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Valid ID / Proof of Residency</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => e.target.files && setIdFile(e.target.files[0])}
                            required
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1 bg-white"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Required for staff to verify your account safely from home.</p>
                    </div>

                    <button 
                        type="submit" disabled={isLoading}
                        className="w-full bg-[#1c4ed8] hover:bg-blue-800 text-white font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50 mt-2"
                    >
                        {isLoading ? "Verifying Record..." : "Claim Profile"}
                    </button>
                </form>
            </div>
        </div>
    );
}