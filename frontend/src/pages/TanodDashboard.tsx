import React, { useState, useEffect } from "react";
import api from "../api";

const API_URL = import.meta.env.VITE_API_URL;

// 1. UPDATED INTERFACE TO MATCH DJANGO EXACTLY
interface IncidentRecord {
    id: number;
    category: string;
    location_details: string;
    description: string;
    photo_attachment?: string | null;
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
    created_at: string;
    reporter_name?: string; 
}

const INCIDENT_CATEGORIES: Record<string, string> = {
    'DISTURBANCE': 'Noise / Disturbance',
    'INFRASTRUCTURE': 'Broken Infrastructure (Lights, Roads)',
    'CLEANLINESS': 'Garbage / Cleanliness',
    'SECURITY': 'Theft / Security Issue',
    'EMERGENCY': 'Health / Fire Emergency',
    'OTHER': 'Other'
};

export default function TanodDashboard() {
    const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [error, setError] = useState("");

    // Modal State
    const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchIncidents = async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/incident-reports/');
            
            if (Array.isArray(res.data)) {
                setIncidents(res.data);
            } else if (res.data.results && Array.isArray(res.data.results)) {
                setIncidents(res.data.results);
            }
        } catch (err) {
            console.error("Failed to fetch incidents:", err);
            setError("Failed to load incident reports.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    const handleStatusUpdate = async (newStatus: string) => {
        if (!selectedIncident) return;
        setIsUpdating(true);

        try {
            // FIX: Added /update_status/ to target the custom Django action
            await api.patch(`/api/incident-reports/${selectedIncident.id}/update_status/`, {
                status: newStatus
            });
            
            setIncidents(prev => 
                prev.map(inc => inc.id === selectedIncident.id ? { ...inc, status: newStatus as any } : inc)
            );
            setSelectedIncident(prev => prev ? { ...prev, status: newStatus as any } : null);
            
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Failed to update the incident status. Please try again.");
        } finally {
            setIsUpdating(false);
        }
    };

    // 2. UPDATED STATUS BADGES TO MATCH DJANGO
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'RESOLVED':
                return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-md border border-green-200">Resolved</span>;
            case 'INVESTIGATING':
                return <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold uppercase rounded-md border border-green-200">Investigating</span>;
            case 'PENDING':
                return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase rounded-md border border-yellow-200 animate-pulse">Pending</span>;
            case 'REJECTED':
                return <span className="px-2.5 py-1 bg-gray-100 text-gray-800 text-xs font-bold uppercase rounded-md border border-gray-200">Rejected</span>;
            default:
                return <span className="px-2.5 py-1 bg-gray-50 text-gray-700 text-xs font-bold uppercase rounded-md border border-gray-200">{status}</span>;
        }
    };

    const filteredIncidents = filter === 'ALL' 
        ? incidents 
        : incidents.filter(inc => inc.status === filter);

    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            

            <div className="flex flex-1 overflow-hidden">
                

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="max-w-7xl mx-auto space-y-6">
                        
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Incident Management</h1>
                                <p className="text-gray-500 text-sm mt-1">Review and manage community incident reports</p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col">
                                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Reports</span>
                                <span className="text-2xl font-bold text-gray-900 mt-1">{incidents.length}</span>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-lg shadow-sm border border-yellow-200 flex flex-col">
                                <span className="text-sm font-semibold text-yellow-700 uppercase tracking-wider">Pending</span>
                                <span className="text-2xl font-bold text-yellow-800 mt-1">{incidents.filter(i => i.status === 'PENDING').length}</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 flex flex-col">
                                <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Investigating</span>
                                <span className="text-2xl font-bold text-green-800 mt-1">{incidents.filter(i => i.status === 'INVESTIGATING').length}</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg shadow-sm border border-green-200 flex flex-col">
                                <span className="text-sm font-semibold text-green-700 uppercase tracking-wider">Resolved</span>
                                <span className="text-2xl font-bold text-green-800 mt-1">{incidents.filter(i => i.status === 'RESOLVED').length}</span>
                            </div>
                        </div>

                        {/* Main Content Area */}
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            {/* Filter Tabs */}
                            <div className="flex border-b border-gray-200 bg-gray-50 px-4">
                                {['ALL', 'PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setFilter(status)}
                                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                                            filter === status 
                                            ? 'border-green-600 text-green-600 bg-white' 
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">
                                    {error}
                                </div>
                            )}

                            {/* Incidents Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Date</th>
                                            <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Category</th>
                                            <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs">Location</th>
                                            <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-center">Status</th>
                                            <th className="px-6 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {isLoading ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                    <div className="flex justify-center items-center gap-2">
                                                        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Loading records...
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredIncidents.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                    No incidents found for this category.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredIncidents.map(incident => (
                                                <tr key={incident.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-600">
                                                        {new Date(incident.created_at).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900">
                                                        {INCIDENT_CATEGORIES[incident.category] || incident.category}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]">
                                                        {incident.location_details}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {renderStatusBadge(incident.status)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => setSelectedIncident(incident)}
                                                            className="text-green-600 hover:text-green-900 font-semibold text-xs border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded transition-colors"
                                                        >
                                                            Review
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* View/Update Incident Modal */}
            {selectedIncident && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900">Incident Details #{selectedIncident.id}</h3>
                            <button onClick={() => setSelectedIncident(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            
                            {/* Current Status Block */}
                            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md border border-gray-200">
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Status</p>
                                    {renderStatusBadge(selectedIncident.status)}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 text-right">Date Reported</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {new Date(selectedIncident.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Category</label>
                                    <p className="text-base text-gray-900 font-medium">
                                        {INCIDENT_CATEGORIES[selectedIncident.category] || selectedIncident.category}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Location</label>
                                    <p className="text-base text-gray-900 font-medium">{selectedIncident.location_details}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Description</label>
                                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-gray-700 text-sm whitespace-pre-wrap">
                                    {selectedIncident.description}
                                </div>
                            </div>

                            {/* 3. UPDATED PHOTO EVIDENCE BLOCK */}
                            {selectedIncident.photo_attachment && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Photo Evidence</label>
                                    <div className="border border-gray-200 rounded-md overflow-hidden bg-gray-100 flex justify-center">
                                        <a 
                                            href={selectedIncident.photo_attachment.startsWith('http') ? selectedIncident.photo_attachment : `${API_URL}${selectedIncident.photo_attachment}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            title="Click to view full size"
                                        >
                                            <img 
                                                src={selectedIncident.photo_attachment.startsWith('http') ? selectedIncident.photo_attachment : `${API_URL}${selectedIncident.photo_attachment}`} 
                                                alt="Incident Evidence" 
                                                className="w-full max-h-96 object-contain hover:opacity-90 transition-opacity cursor-pointer"
                                            />
                                        </a>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 italic text-center">Click image to view in full size</p>
                                </div>
                            )}

                        </div>

                        {/* Modal Footer / Action Controls */}
                        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-3 justify-end items-center">
                            <span className="text-sm text-gray-500 mr-auto font-medium">Update Status:</span>
                            
                            <button 
                                onClick={() => handleStatusUpdate('PENDING')}
                                disabled={isUpdating || selectedIncident.status === 'PENDING'}
                                className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-md border border-yellow-200 hover:bg-yellow-200 disabled:opacity-50 transition-colors"
                            >
                                Mark Pending
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('INVESTIGATING')}
                                disabled={isUpdating || selectedIncident.status === 'INVESTIGATING'}
                                className="px-4 py-2 bg-green-100 text-green-800 text-sm font-semibold rounded-md border border-green-200 hover:bg-green-200 disabled:opacity-50 transition-colors"
                            >
                                Mark Investigating
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('RESOLVED')}
                                disabled={isUpdating || selectedIncident.status === 'RESOLVED'}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                                Mark Resolved
                            </button>
                            <button 
                                onClick={() => handleStatusUpdate('REJECTED')}
                                disabled={isUpdating || selectedIncident.status === 'REJECTED'}
                                className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-md hover:bg-gray-300 disabled:opacity-50 transition-colors"
                            >
                                Reject / Invalid
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}