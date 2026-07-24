import React, { useState, useEffect } from "react";
import api from "../api";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

interface PendingResident {
    id: number;
    first_name: string;
    last_name: string;
    birth_date: string;
    civil_status: string;
    sex: string;
    purok: string;
    approval_status: string;
}

interface CorrectionRequest {
    id: number;
    resident_name: string;
    requested_first_name: string;
    requested_last_name: string;
    requested_birth_date: string;
    requested_civil_status: string;
    reason: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    created_at: string;
}

export default function VerificationHub() {
    const [activeTab, setActiveTab] = useState<'claims' | 'corrections'>('claims');
    
    // States for Pending Claims
    const [pendingResidents, setPendingResidents] = useState<PendingResident[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(true);

    // States for Profile Corrections
    const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
    const [loadingCorrections, setLoadingCorrections] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Fetch Initial Claims
    const fetchPendingClaims = async () => {
        try {
            const res = await api.get('/api/resident-approvals/pending/');
            setPendingResidents(res.data);
        } catch (error) {
            console.error("Failed to fetch pending claims", error);
        } finally {
            setLoadingClaims(false);
        }
    };

    // Fetch Profile Correction Requests
    const fetchCorrections = async () => {
        try {
            const res = await api.get('/api/manager/profile-updates/');
            setCorrections(res.data);
        } catch (error) {
            console.error("Failed to fetch profile corrections", error);
        } finally {
            setLoadingCorrections(false);
        }
    };

    useEffect(() => {
        fetchPendingClaims();
        fetchCorrections();
    }, []);

    // Handle Claim Action (Approve/Reject Initial Link)
    const handleClaimAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        setActionLoading(id);
        try {
            await api.post(`/api/resident-approvals/${id}/update_status/`, { status });
            await fetchPendingClaims();
        } catch (error) {
            alert("Failed to process claim.");
        } finally {
            setActionLoading(null);
        }
    };

    // Handle Correction Action (Approve/Reject Online Updates)
    const handleCorrectionAction = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        setActionLoading(id);
        try {
            await api.patch(`/api/manager/profile-updates/${id}/`, { status });
            await fetchCorrections();
        } catch (error) {
            alert("Failed to process correction request.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="w-full space-y-6">
                        
                        {/* Page Header */}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Verification Hub</h1>
                            <p className="text-gray-500 text-sm mt-1">Manage initial account claims and accessibility-driven profile correction requests.</p>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex border-b border-gray-200 gap-6">
                            <button
                                onClick={() => setActiveTab('claims')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'claims' 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Pending Initial Claims ({pendingResidents.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('corrections')}
                                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'corrections' 
                                        ? 'border-blue-600 text-blue-600' 
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Profile Correction Requests ({corrections.filter(c => c.status === 'PENDING').length})
                            </button>
                        </div>

                        {/* TAB 1: PENDING INITIAL CLAIMS */}
                        {activeTab === 'claims' && (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Resident Name</th>
                                            <th className="px-6 py-4 font-semibold">Birth Date</th>
                                            <th className="px-6 py-4 font-semibold">Civil Status</th>
                                            <th className="px-6 py-4 font-semibold">Purok</th>
                                            <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingClaims ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-gray-500 font-medium">Loading claims...</td></tr>
                                        ) : pendingResidents.length === 0 ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-gray-500 font-medium">No pending profile claims found.</td></tr>
                                        ) : (
                                            pendingResidents.map((res) => (
                                                <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{res.first_name} {res.last_name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{res.birth_date}</td>
                                                    <td className="px-6 py-4 text-gray-600">{res.civil_status}</td>
                                                    <td className="px-6 py-4 text-gray-600">{res.purok}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => handleClaimAction(res.id, 'APPROVED')}
                                                                disabled={actionLoading === res.id}
                                                                className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                                                            >
                                                                Approve Claim
                                                            </button>
                                                            <button 
                                                                onClick={() => handleClaimAction(res.id, 'REJECTED')}
                                                                disabled={actionLoading === res.id}
                                                                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* TAB 2: PROFILE CORRECTIONS (Accessibility Focus) */}
                        {activeTab === 'corrections' && (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto w-full">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Resident</th>
                                            <th className="px-6 py-4 font-semibold">Requested Changes</th>
                                            <th className="px-6 py-4 font-semibold">Accessibility Reason / Note</th>
                                            <th className="px-6 py-4 font-semibold text-center">Status</th>
                                            <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loadingCorrections ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-gray-500 font-medium">Loading requests...</td></tr>
                                        ) : corrections.length === 0 ? (
                                            <tr><td colSpan={5} className="py-8 text-center text-gray-500 font-medium">No pending profile corrections.</td></tr>
                                        ) : (
                                            corrections.map((req) => (
                                                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{req.resident_name}</td>
                                                    <td className="px-6 py-4 text-xs space-y-1">
                                                        {req.requested_first_name || req.requested_last_name ? (
                                                            <p><span className="font-semibold text-gray-700">Name:</span> {req.requested_first_name} {req.requested_last_name}</p>
                                                        ) : null}
                                                        {req.requested_birth_date ? (
                                                            <p><span className="font-semibold text-gray-700">Birthdate:</span> {req.requested_birth_date}</p>
                                                        ) : null}
                                                        {req.requested_civil_status ? (
                                                            <p><span className="font-semibold text-gray-700">Civil Status:</span> {req.requested_civil_status}</p>
                                                        ) : null}
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 italic max-w-xs">"{req.reason}"</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            req.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                                            req.status === 'REJECTED' ? 'bg-red-100 text-red-800 border border-red-200' : 
                                                            'bg-orange-100 text-orange-800 border border-orange-200'
                                                        }`}>
                                                            {req.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {req.status === 'PENDING' ? (
                                                            <div className="flex justify-center gap-2">
                                                                <button 
                                                                    onClick={() => handleCorrectionAction(req.id, 'APPROVED')}
                                                                    disabled={actionLoading === req.id}
                                                                    className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleCorrectionAction(req.id, 'REJECTED')}
                                                                    disabled={actionLoading === req.id}
                                                                    className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 font-medium">Processed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}