import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

interface ResidentSearchData {
    id: number;
    first_name: string;
    last_name: string;
    purok: string;
    household: number | null;
}

interface AssignResidentModalProps {
    householdId: number;
    onClose: () => void;
    onAssignSuccess: () => void;
}

export default function AssignResidentModal({ householdId, onClose, onAssignSuccess }: AssignResidentModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ResidentSearchData[]>([]);
    const [isAssigning, setIsAssigning] = useState<number | null>(null);

    // Prevent background scrolling
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // Fetch residents based on search query
    useEffect(() => {
        const fetchResidents = async () => {
            try {
                // Fetch residents. If no query, maybe fetch the latest ones. 
                const url = searchQuery 
                    ? `${API_URL}/api/residents/?search=${encodeURIComponent(searchQuery)}`
                    : `${API_URL}/api/residents/`; // You could add ?limit=10 to not overload the initial open
                
                const response = await fetch(url, { headers: getAuthHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    // Filter out residents that are ALREADY in this exact household
                    const results = (data.results || data).filter((r: ResidentSearchData) => r.household !== householdId);
                    setSearchResults(results);
                }
            } catch (error) {
                console.error("Error searching residents:", error);
            }
        };

        const timeoutId = setTimeout(fetchResidents, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, householdId]);

    // Assign the resident to the household
    const handleAssign = async (residentId: number) => {
        setIsAssigning(residentId);
        try {
            // We use PATCH to only update the 'household' field on the Resident model
            const response = await fetch(`${API_URL}/api/residents/${residentId}/`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ household: householdId })
            });

            if (response.ok) {
                onAssignSuccess(); // Close modal and refresh map
            } else {
                alert("Failed to assign resident.");
            }
        } catch (error) {
            console.error("Network error:", error);
        } finally {
            setIsAssigning(null);
        }
    };

    return (
        <div className="fixed inset-0 z-2000 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden animate-fade-in-up">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-gray-900">Link Existing Resident</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                </div>
                
                {/* Search Bar Area */}
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <div className="relative w-full">
                        <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input 
                            type="text" 
                            placeholder="Search by name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {searchResults.length > 0 ? searchResults.map((resident) => (
                        <div key={resident.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                            <div>
                                <h3 className="font-semibold text-gray-900">{resident.first_name} {resident.last_name}</h3>
                                <p className="text-xs text-gray-500">
                                    {resident.purok} {resident.household ? '(Moving from another house)' : '(Unmapped)'}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleAssign(resident.id)}
                                disabled={isAssigning === resident.id}
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    isAssigning === resident.id 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                }`}
                            >
                                {isAssigning === resident.id ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-sm text-gray-500 italic">
                            No residents found. Try adjusting your search.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}