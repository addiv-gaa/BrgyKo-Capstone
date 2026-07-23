import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

export default function ClaimProfile() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthdate, setBirthdate] = useState("");
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

        try {
            const response = await fetch(`${API_URL}/api/claim-profile/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: firstName,
                    last_name: lastName,
                    birthdate: birthdate
                })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(data.message);
                setTimeout(() => {
                    navigate('/dashboard'); // Redirect to home/dashboard after success
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
                    <p className="text-sm text-gray-500 mt-1">Enter your pre-registered barangay registry details to unlock document requests.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">{error}</div>}
                {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-md">{success}</div>}

                <form onSubmit={handleClaim} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input 
                            type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                            placeholder="e.g. Juan" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input 
                            type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                            placeholder="e.g. Dela Cruz" className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                        <input 
                            type="date" required value={birthdate} onChange={(e) => setBirthdate(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                        />
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