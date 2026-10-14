import api from '../api';
import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import ResidentModal, { type ResidentProperties } from '../components/ResidentModal';

const API_URL = import.meta.env.VITE_API_URL;

export interface ResidentData {
    id: number;
    inhabitant_type: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    suffix?: string;
    birth_place?: string;
    birth_date: string | null;
    sex: string;
    civil_status: string;
    citizenship: string;
    occupation?: string;
    contact_number?: string;
    email_address?: string;
    highest_education?: string;
    mothers_first_name?: string;
    mothers_middle_name?: string;
    mothers_last_name?: string;
    
    purok: string;
    is_registered_voter: boolean;
    relationship_to_head: string;
    household?: number | null;
    is_4ps_beneficiary: boolean;
    is_senior_citizen: boolean;
    is_pwd: boolean;
    is_solo_parent: boolean;
    is_indigenous: boolean;
    is_ofw: boolean;
    is_out_of_school: boolean;
}

// --- UI Helper Functions ---
const calculateAge = (dob: string | null) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export default function ResidentPage() {
    const authContext = useContext(AuthContext);
    const isReadOnly = ['CAPTAIN', 'STAFF'].includes(authContext?.user?.role || '');
    
    const [residents, setResidents] = useState<ResidentData[]>([]);
    const [householdOptions, setHouseholdOptions] = useState<{id: number, address: string}[]>([]);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        purok: '',
        sex: '',
        civil_status: '',
        is_registered_voter: false,
        is_4ps_beneficiary: false,
        is_senior_citizen: false,
        is_pwd: false,
        is_solo_parent: false,
        is_indigenous: false,
        is_ofw: false,
        is_out_of_school: false
    });

    // Pagination & Sorting State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [ordering, setOrdering] = useState('-id');
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedResident, setSelectedResident] = useState<ResidentProperties | null>(null);
    const [isConfirmingSave, setIsConfirmingSave] = useState(false);
    const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);
    const [isConfirmingBulkUpdate, setIsConfirmingBulkUpdate] = useState(false);
    const [pendingResidentData, setPendingResidentData] = useState<any>(null);
    const [residentToDelete, setResidentToDelete] = useState<number | null>(null);

    // Upload & Export State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [importResults, setImportResults] = useState<{message: string, errors: string[]} | null>(null);

    // NEW: Bulk Selection & Bulk Update State
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkUpdateFlags, setBulkUpdateFlags] = useState<{
        is_4ps_beneficiary: boolean | null,
        is_senior_citizen: boolean | null,
        is_pwd: boolean | null,
        is_solo_parent: boolean | null,
        is_registered_voter: boolean | null,
        is_indigenous: boolean | null,
        is_ofw: boolean | null,
        is_out_of_school: boolean | null
    }>({
        is_4ps_beneficiary: null,
        is_senior_citizen: null,
        is_pwd: null,
        is_solo_parent: null,
        is_registered_voter: null,
        is_indigenous: null,
        is_ofw: null,
        is_out_of_school: null
    });

    const [activeTab, setActiveTab] = useState<'directory' | 'queue'>('directory');

    // NEW: Approval Queue Modal State
    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        actionType: 'approve' | 'deny';
        isBulk: boolean;
        targetId?: number;
    }>({ isOpen: false, actionType: 'approve', isBulk: false });
    const [isConfirming, setIsConfirming] = useState(false);

    // F-024: Feedback modal state when Admin/Staff submits a resident to the Captain's queue
    const [submissionFeedback, setSubmissionFeedback] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
    }>({ isOpen: false, title: '', message: '' });

    const fetchResidents = async () => {
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                page_size: '50',
                ordering: ordering,
            });

            if (activeTab === 'queue') {
                queryParams.append('pending', 'true');
            }

            if (searchQuery) queryParams.append('search', searchQuery);
            if (filters.purok) queryParams.append('purok', filters.purok);
            if (filters.sex) queryParams.append('sex', filters.sex);
            if (filters.civil_status) queryParams.append('civil_status', filters.civil_status);
            if (filters.is_4ps_beneficiary) queryParams.append('is_4ps_beneficiary', 'True');
            if (filters.is_senior_citizen) queryParams.append('is_senior_citizen', 'True');
            if (filters.is_pwd) queryParams.append('is_pwd', 'True');
            if (filters.is_solo_parent) queryParams.append('is_solo_parent', 'True');
            if (filters.is_indigenous) queryParams.append('is_indigenous', 'True');
            if (filters.is_ofw) queryParams.append('is_ofw', 'True');
            if (filters.is_out_of_school) queryParams.append('is_out_of_school', 'True');

            const response = await api.get(`/api/residents/?${queryParams.toString()}`);
            if ((response.status >= 200 && response.status < 300)) {
                const data = response.data;
                if (data.results) {
                    setResidents(data.results);
                    setTotalPages(Math.ceil(data.count / 50));
                    setTotalCount(data.count);
                } else {
                    setResidents(data);
                    setTotalPages(1);
                    setTotalCount(data.length);
                }
                setSelectedRows([]); // Clear selections on fetch
            }
        } catch (error) {
            console.error("Network error fetching residents:", error);
        }
    };

    const fetchHouseholdsForDropdown = async () => {
        try {
            const response = await api.get(`/api/households/`);
            if ((response.status >= 200 && response.status < 300)) {
                const data = response.data;
                const formatted = (data.features || []).map((f: any) => ({
                    id: f.id,
                    address: f.properties.address
                }));
                setHouseholdOptions(formatted);
            }
        } catch (error) {
            console.error("Error fetching households:", error);
        }
    };

    useEffect(() => {
        fetchHouseholdsForDropdown();
    }, []);

    useEffect(() => {
        // Debounce search query effect if needed, but for now just trigger
        const delayDebounceFn = setTimeout(() => {
            fetchResidents();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [page, filters, searchQuery, ordering, activeTab]);

    const handleSingleApprove = (id: number) => setConfirmAction({ isOpen: true, actionType: 'approve', isBulk: false, targetId: id });
    const handleSingleDeny = (id: number) => setConfirmAction({ isOpen: true, actionType: 'deny', isBulk: false, targetId: id });
    


    const executeConfirmAction = async () => {
        setIsConfirming(true);
        const ids = confirmAction.isBulk ? selectedRows : (confirmAction.targetId ? [confirmAction.targetId] : []);
        const endpoint = confirmAction.actionType === 'approve' ? '/api/residents/bulk-approve/' : '/api/residents/bulk-deny/';
        
        try {
            if (confirmAction.actionType === 'approve') {
                await api.patch(endpoint, { ids });
            } else {
                await api.post(endpoint, { ids });
            }
            if (confirmAction.isBulk) setSelectedRows([]);
            fetchResidents();
            setConfirmAction(prev => ({ ...prev, isOpen: false }));
        } catch (error) { 
            console.error(error); 
            alert(`Error ${confirmAction.actionType}ing resident(s)`); 
        } finally {
            setIsConfirming(false);
        }
    };


    // --- BULK SELECTION HANDLERS ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRows(filteredResidents.map(res => res.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id: number) => {
        setSelectedRows(prev => 
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    // Bulk Delete
    const handleBulkDelete = () => {
        if (selectedRows.length === 0) return;
        setIsConfirmingBulkDelete(true);
    };

    const executeBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            const response = await api.post(`/api/residents/bulk_delete/`, { ids: selectedRows });

            if ((response.status >= 200 && response.status < 300)) {
                setSelectedRows([]);
                fetchResidents();
            } else {
                const errorData = response.data;
                alert(errorData.error || "Failed to bulk delete residents.");
            }
        } catch (error) {
            console.error("Network error during bulk delete:", error);
            alert("A network error occurred.");
        } finally {
            setIsBulkDeleting(false);
            setIsConfirmingBulkDelete(false);
        }
    };

    // Bulk Update Welfare
    const handleBulkUpdateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRows.length === 0) return;
        setIsConfirmingBulkUpdate(true);
    };

    const executeBulkUpdate = async () => {
        setIsBulkUpdating(true);
        try {
            const response = await api.post(`/api/residents/bulk_update_welfare/`, { ids: selectedRows, flags: bulkUpdateFlags });

            if ((response.status >= 200 && response.status < 300)) {
                setShowBulkUpdateModal(false);
                setSelectedRows([]); // Reset selection
                // Reset flags for next time
                setBulkUpdateFlags({ is_4ps_beneficiary: null, is_senior_citizen: null, is_pwd: null, is_solo_parent: null, is_registered_voter: null, is_indigenous: null, is_ofw: null, is_out_of_school: null });
                fetchResidents();
            } else {
                const errorData = response.data;
                alert(errorData.error || "Failed to update welfare statuses.");
            }
        } catch (error) {
            console.error("Network error during bulk update:", error);
            alert("A network error occurred.");
        } finally {
            setIsBulkUpdating(false);
            setIsConfirmingBulkUpdate(false);
        }
    };


    // --- Excel Upload Handler ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);

        try {
            const response = await api.post(`/api/residents/import-excel/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

            const data = response.data;

            if ((response.status >= 200 && response.status < 300)) {
                setImportResults({ message: data.message, errors: data.errors || [] });
                fetchResidents();
            } else {
                setImportResults({ message: "Import Failed", errors: [data.error || "An unknown error occurred."] });
            }
        } catch (error) {
            console.error("Upload error:", error);
            setImportResults({ message: "Upload Error", errors: ["A network error occurred during upload."] });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    // --- Excel Export Handler ---
    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const response = await api.get(`/api/residents/export_excel/`, { responseType: 'blob' });

            if (!(response.status >= 200 && response.status < 300)) throw new Error("Failed to export registry");

            const blob = response.data;
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Resident_Registry_Export_${timestamp}.xlsx`);
            document.body.appendChild(link);
            
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Export Error:", error);
            alert("An error occurred while exporting the resident registry.");
        } finally {
            setIsExporting(false);
        }
    };

    const executeSaveResident = async () => {
        if (!pendingResidentData) return;
        try {
            const method = modalMode === 'edit' ? 'PUT' : 'POST';
            const url = modalMode === 'edit' 
                ? `${API_URL}/api/residents/${selectedResident?.id}/` 
                : `${API_URL}/api/residents/`;

            const response = await api({ method: method, url: url.replace(API_URL, ''), data: pendingResidentData });

            if ((response.status >= 200 && response.status < 300)) {
                setIsModalOpen(false);
                setIsConfirmingSave(false);
                setPendingResidentData(null);
                fetchResidents();

                // F-024: Show feedback notice when creating a new resident that goes to the Captain's queue
                if (modalMode !== 'edit') {
                    setSubmissionFeedback({
                        isOpen: true,
                        title: "Submitted for Captain's Approval",
                        message: "The resident record has been created successfully. Since all new resident additions require Captain approval, it has been placed in the Approval Queue."
                    });
                }
            } else {
                const errorData = response.data;
                const errDetail = errorData?.error || errorData?.detail || (typeof errorData === 'object' ? Object.values(errorData)[0] : null) || "Failed to save resident record.";
                alert(typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail));
                setIsConfirmingSave(false);
            }
        } catch (error: any) {
            console.error("Network error saving resident:", error);
            const errDetail = error.response?.data?.error || error.response?.data?.detail || (typeof error.response?.data === 'object' ? Object.values(error.response?.data)[0] : null) || error.message || "Network error occurred.";
            alert(typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail));
            setIsConfirmingSave(false);
        }
    };

    const handleDeleteResident = (id: number) => {
        setResidentToDelete(id);
    };

    const executeDeleteResident = async () => {
        if (!residentToDelete) return;
        try {
            const response = await api.delete(`/api/residents/${residentToDelete}/`);
            if ((response.status >= 200 && response.status < 300) || response.status === 204) {
                setResidentToDelete(null);
                fetchResidents();
            } else {
                alert("Failed to delete resident.");
                setResidentToDelete(null);
            }
        } catch (error) {
            console.error("Network error deleting resident:", error);
            setResidentToDelete(null);
        }
    };

    // --- FRONTEND FILTERING ENGINE ---
    const uniquePuroks = Array.from(new Set(residents.map(r => r.purok))).filter(Boolean).sort();

    const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFilters(prev => ({ ...prev, [name]: checked }));
        } else {
            setFilters(prev => ({ ...prev, [name]: value }));
        }
    };

    const clearFilters = () => {
        setFilters({
            purok: '', sex: '', civil_status: '',
            is_4ps_beneficiary: false, is_senior_citizen: false, is_pwd: false, is_solo_parent: false,
            is_registered_voter: false, is_indigenous: false, is_ofw: false, is_out_of_school: false
        });
        setSearchQuery('');
        setPage(1);
    };

    const activeFilterCount = Object.values(filters).filter(val => val === true || (typeof val === 'string' && val !== '')).length;

    // Use residents directly since filtering is server-side
    const filteredResidents = residents;


    return (
        <div className="h-full w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            
            <div className="flex flex-1 overflow-hidden">
                
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Information</h1>
                            <p className="text-gray-500 text-sm">Barangay Census Database</p>
                        </div>
                        
                        <div className="flex gap-3">
                            {activeTab === 'directory' && (
                                <>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                                        {isUploading ? "Importing..." : <span>Import Excel</span>}
                                    </button>
                                    <button onClick={handleExportExcel} disabled={isExporting} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                                        {isExporting ? "Exporting..." : <span>Export Excel</span>}
                                    </button>
                                    {!isReadOnly && (
                                        <button onClick={() => { setModalMode('add'); setSelectedResident(null); setIsModalOpen(true); }} className="bg-[#15803d] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-800 transition-colors flex items-center gap-2 shadow-sm">
                                            <span>+ Add Resident</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    {/* TABS */}
                    <div className="flex space-x-1 border-b border-gray-200 mb-6">
                        <button
                            onClick={() => { setActiveTab('directory'); setPage(1); setSelectedRows([]); }}
                            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'directory' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Resident Directory
                        </button>
                        <button
                            onClick={() => { setActiveTab('queue'); setPage(1); setSelectedRows([]); }}
                            className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'queue' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Approval Queue
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
                        
                        {/* FLOATING BULK ACTION BAR */}
                        {selectedRows.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-green-600 text-white px-6 py-3 flex justify-between items-center z-10 animate-fade-in-down shadow-md">
                                <div className="font-semibold flex items-center gap-2">
                                    <span className="bg-white text-green-700 px-2 py-0.5 rounded-md text-xs">{selectedRows.length}</span> 
                                    Residents Selected
                                </div>
                                {activeTab === 'directory' && !isReadOnly && (
                                    <div className="flex gap-3 items-center">
                                        <button 
                                            onClick={() => setShowBulkUpdateModal(true)}
                                            className="bg-white text-green-700 hover:bg-green-50 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            Update Welfare
                                        </button>
                                        <button 
                                            onClick={handleBulkDelete}
                                            disabled={isBulkDeleting}
                                            className="bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                                        </button>
                                        <div className="w-px h-6 bg-green-400 mx-1"></div>
                                    </div>
                                )}
                                {activeTab === 'queue' && authContext?.user?.role === 'CAPTAIN' && (
                                    <div className="flex gap-3 items-center">
                                        <button 
                                            onClick={() => setConfirmAction({ isOpen: true, actionType: 'approve', isBulk: true, targetId: undefined })}
                                            className="bg-white text-green-700 hover:bg-green-50 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Approve Selected
                                        </button>
                                        <button 
                                            onClick={() => setConfirmAction({ isOpen: true, actionType: 'deny', isBulk: true, targetId: undefined })}
                                            className="bg-white text-red-600 hover:bg-red-50 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Deny Selected
                                        </button>
                                        <div className="w-px h-6 bg-green-400 mx-1"></div>
                                    </div>
                                )}


                                <button onClick={() => setSelectedRows([])} className="text-white hover:text-green-200 text-sm font-medium transition-colors ml-4">
                                    Clear Selection
                                </button>

                            </div>
                        )}

                        {/* Search & Filter Trigger Bar */}
                        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-white">
                            <div className="relative flex-1 max-w-2xl">
                                <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" placeholder="Search by name or purok..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors" />
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filters {activeFilterCount > 0 && <span className="bg-green-600 text-white rounded-full px-2 py-0.5 text-xs">{activeFilterCount}</span>}
                            </button>
                        </div>

                        {/* Expandable Filter Panel */}
                        {showFilters && (
                            <div className="bg-gray-50 p-5 border-b border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Purok / Zone</label>
                                        <select name="purok" value={filters.purok} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                            <option value="">All Puroks</option>
                                            {uniquePuroks.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Sex</label>
                                        <select name="sex" value={filters.sex} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                            <option value="">All</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Civil Status</label>
                                        <select name="civil_status" value={filters.civil_status} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                            <option value="">All</option>
                                            <option value="Single">Single</option>
                                            <option value="Married">Married</option>
                                            <option value="Widowed">Widowed</option>
                                            <option value="Separated">Separated</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center justify-between border-t border-gray-200 pt-4">
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-purple-50 hover:border-purple-200 transition-colors">
                                            <input type="checkbox" name="is_4ps_beneficiary" checked={filters.is_4ps_beneficiary} onChange={handleFilterChange} className="w-4 h-4 text-purple-600 rounded" />
                                            <span className="font-medium text-gray-700">4Ps Beneficiary</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">
                                            <input type="checkbox" name="is_senior_citizen" checked={filters.is_senior_citizen} onChange={handleFilterChange} className="w-4 h-4 text-orange-600 rounded" />
                                            <span className="font-medium text-gray-700">Senior Citizen</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                            <input type="checkbox" name="is_pwd" checked={filters.is_pwd} onChange={handleFilterChange} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="font-medium text-gray-700">PWD</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-pink-50 hover:border-pink-200 transition-colors">
                                            <input type="checkbox" name="is_solo_parent" checked={filters.is_solo_parent} onChange={handleFilterChange} className="w-4 h-4 text-pink-600 rounded" />
                                            <span className="font-medium text-gray-700">Solo Parent</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-yellow-50 hover:border-yellow-200 transition-colors">
                                            <input type="checkbox" name="is_indigenous" checked={filters.is_indigenous} onChange={handleFilterChange} className="w-4 h-4 text-yellow-600 rounded" />
                                            <span className="font-medium text-gray-700">Indigenous (IP)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-cyan-50 hover:border-cyan-200 transition-colors">
                                            <input type="checkbox" name="is_ofw" checked={filters.is_ofw} onChange={handleFilterChange} className="w-4 h-4 text-cyan-600 rounded" />
                                            <span className="font-medium text-gray-700">OFW</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                                            <input type="checkbox" name="is_out_of_school" checked={filters.is_out_of_school} onChange={handleFilterChange} className="w-4 h-4 text-red-600 rounded" />
                                            <span className="font-medium text-gray-700">Out of School</span>
                                        </label>
                                    </div>
                                    <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-red-600 font-semibold transition-colors mt-2 md:mt-0">
                                        Clear Filters
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Active Filters Display */}
                        {activeFilterCount > 0 && (
                            <div className="bg-green-50 px-5 py-3 border-b border-gray-200 flex flex-wrap gap-2 items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Active Filters:</span>
                                {filters.purok && <span className="bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Purok: {filters.purok}</span>}
                                {filters.sex && <span className="bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Sex: {filters.sex}</span>}
                                {filters.civil_status && <span className="bg-white border border-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Civil Status: {filters.civil_status}</span>}
                                {filters.is_4ps_beneficiary && <span className="bg-purple-100 border border-purple-200 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">4Ps Only</span>}
                                {filters.is_senior_citizen && <span className="bg-orange-100 border border-orange-200 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">Seniors Only</span>}
                                {filters.is_pwd && <span className="bg-blue-100 border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">PWD Only</span>}
                                {filters.is_solo_parent && <span className="bg-pink-100 border border-pink-200 text-pink-700 px-2 py-1 rounded-full text-xs font-bold">Solo Parents Only</span>}
                                <span className="ml-auto text-green-600 font-bold text-xs">{totalCount} Results</span>
                            </div>
                        )}

                        {/* Result Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4 w-10 sticky left-0 bg-gray-50 z-10">
                                            {(activeTab === 'directory' || (activeTab === 'queue' && authContext?.user?.role === 'CAPTAIN')) && (
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 rounded text-green-600 cursor-pointer"
                                                    checked={filteredResidents.length > 0 && selectedRows.length === filteredResidents.length}
                                                    onChange={handleSelectAll}
                                                />
                                            )}
                                        </th>
                                        <th className="px-6 py-4">Inhabitant Type</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200" onClick={() => {setOrdering(ordering === 'last_name' ? '-last_name' : 'last_name'); setPage(1);}}>
                                            <div className="flex items-center gap-1">Last Name {ordering === 'last_name' ? '↑' : ordering === '-last_name' ? '↓' : ''}</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200" onClick={() => {setOrdering(ordering === 'first_name' ? '-first_name' : 'first_name'); setPage(1);}}>
                                            <div className="flex items-center gap-1">First Name {ordering === 'first_name' ? '↑' : ordering === '-first_name' ? '↓' : ''}</div>
                                        </th>
                                        <th className="px-6 py-4">Middle Name</th>
                                        <th className="px-6 py-4">Suffix</th>
                                        <th className="px-6 py-4">Birth Place</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200" onClick={() => {setOrdering(ordering === 'birth_date' ? '-birth_date' : 'birth_date'); setPage(1);}}>
                                            <div className="flex items-center gap-1">Birthdate {ordering === 'birth_date' ? '↑' : ordering === '-birth_date' ? '↓' : ''}</div>
                                        </th>
                                        <th className="px-6 py-4">Sex</th>
                                        <th className="px-6 py-4">Civil Status</th>
                                        <th className="px-6 py-4">Citizenship</th>
                                        <th className="px-6 py-4">Occupation</th>
                                        <th className="px-6 py-4">Contact Number</th>
                                        <th className="px-6 py-4">Email Address</th>
                                        <th className="px-6 py-4">Highest Education</th>
                                        <th className="px-6 py-4">Mother's First Name</th>
                                        <th className="px-6 py-4">Mother's Middle Name</th>
                                        <th className="px-6 py-4">Mother's Last Name</th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-200" onClick={() => {setOrdering(ordering === 'purok' ? '-purok' : 'purok'); setPage(1);}}>
                                            <div className="flex items-center gap-1">Purok {ordering === 'purok' ? '↑' : ordering === '-purok' ? '↓' : ''}</div>
                                        </th>
                                        <th className="px-6 py-4">Voter Status</th>
                                        <th className="px-6 py-4">Welfare Status</th>
                                        <th className="px-6 py-4 text-center sticky right-0 bg-gray-50 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredResidents.length > 0 ? filteredResidents.map((resident) => {
                                        const isSelected = selectedRows.includes(resident.id);
                                        return (
                                            <tr key={resident.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50' : ''}`}>
                                                <td className="px-6 py-4 sticky left-0 bg-inherit z-10">
                                                    {(activeTab === 'directory' || (activeTab === 'queue' && authContext?.user?.role === 'CAPTAIN')) && (
                                                        <input 
                                                            type="checkbox" 
                                                            className="w-4 h-4 rounded text-green-600 cursor-pointer"
                                                            checked={isSelected}
                                                            onChange={() => handleSelectRow(resident.id)}
                                                        />
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{resident.inhabitant_type}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">{resident.last_name}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{resident.first_name}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.middle_name || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.suffix || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.birth_place || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">
                                                    {resident.birth_date ? new Date(resident.birth_date).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{resident.sex}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.civil_status}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.citizenship}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.occupation || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.contact_number || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.email_address || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.highest_education || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.mothers_first_name || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.mothers_middle_name || '-'}</td>
                                                <td className="px-6 py-4 text-gray-600">{resident.mothers_last_name || '-'}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{resident.purok}</td>
                                                <td className="px-6 py-4">
                                                    {resident.is_registered_voter ? (
                                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-200">Registered</span>
                                                    ) : (
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">Not Registered</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 flex gap-1.5 flex-wrap w-48">
                                                    {resident.is_4ps_beneficiary && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200">4Ps</span>}
                                                    {resident.is_senior_citizen && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-200">Senior</span>}
                                                    {resident.is_pwd && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">PWD</span>}
                                                    {resident.is_solo_parent && <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-[10px] font-bold border border-pink-200">Solo Parent</span>}
                                                    {resident.is_indigenous && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200">IP</span>}
                                                    {resident.is_ofw && <span className="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded text-[10px] font-bold border border-cyan-200">OFW</span>}
                                                    {resident.is_out_of_school && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">OSC/OSY</span>}
                                                    {!resident.is_4ps_beneficiary && !resident.is_senior_citizen && !resident.is_pwd && !resident.is_solo_parent && !resident.is_indigenous && !resident.is_ofw && !resident.is_out_of_school && (
                                                        <span className="text-gray-400 text-xs italic">None</span>
                                                    )}
                                                </td>

                                                <td className="px-6 py-4 text-center sticky right-0 bg-inherit shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                                    <div className="flex gap-2 justify-center">
                                                        <button onClick={() => { setModalMode('view'); setSelectedResident(resident as ResidentProperties); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg transition-colors" title="View Details">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </button>
                                                        {activeTab === 'directory' && !isReadOnly && (
                                                            <>
                                                                <button onClick={() => { setModalMode('edit'); setSelectedResident(resident as ResidentProperties); setIsModalOpen(true); }} className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 p-2 rounded-lg transition-colors" title="Edit Resident">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                </button>
                                                                <button onClick={() => handleDeleteResident(resident.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg transition-colors" title="Delete Resident">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </>
                                                        )}
                                                        {activeTab === 'queue' && authContext?.user?.role === 'CAPTAIN' && (
                                                            <>
                                                                <button onClick={() => handleSingleApprove(resident.id)} className="text-green-600 hover:text-green-800 bg-green-50 p-2 rounded-lg transition-colors font-bold text-xs" title="Approve">
                                                                    Approve
                                                                </button>
                                                                <button onClick={() => handleSingleDeny(resident.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg transition-colors font-bold text-xs" title="Deny">
                                                                    Deny
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={22} className="px-6 py-12 text-center text-gray-500 font-medium">
                                                <div className="flex flex-col items-center justify-center">
                                                    <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                    No residents found matching your criteria.
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination Controls */}
                        <div className="px-6 py-4 bg-white border-t border-gray-200 flex justify-between items-center rounded-b-xl">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))} 
                                disabled={page === 1}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-sm font-medium text-gray-600">
                                Page <strong className="text-gray-900">{page}</strong> of <strong className="text-gray-900">{totalPages}</strong>
                            </span>
                            <button 
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                                disabled={page === totalPages || totalPages === 0}
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            {/* --- NEW: BULK UPDATE MODAL --- */}
            {showBulkUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-gray-900">Bulk Update Welfare</h3>
                            <button onClick={() => setShowBulkUpdateModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleBulkUpdateSubmit}>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                                    Update welfare statuses for <strong className="text-green-600">{selectedRows.length} selected residents</strong>. Flags set to "Unchanged" will not be modified.
                                </p>
                                
                                {Object.entries({
                                    'is_registered_voter': 'Registered Voter',
                                    'is_4ps_beneficiary': '4Ps Beneficiary',
                                    'is_senior_citizen': 'Senior Citizen',
                                    'is_pwd': 'PWD',
                                    'is_solo_parent': 'Solo Parent',
                                    'is_indigenous': 'Indigenous (IP)',
                                    'is_ofw': 'OFW',
                                    'is_out_of_school': 'Out of School'
                                }).map(([key, label]) => (
                                    <div key={key} className="flex flex-col gap-1.5">
                                        <label className="text-xs font-bold text-gray-700">{label}</label>
                                        <select 
                                            value={bulkUpdateFlags[key as keyof typeof bulkUpdateFlags] === null ? 'null' : bulkUpdateFlags[key as keyof typeof bulkUpdateFlags]?.toString()} 
                                            onChange={(e) => {
                                                const val = e.target.value === 'null' ? null : e.target.value === 'true';
                                                setBulkUpdateFlags(prev => ({ ...prev, [key]: val }));
                                            }}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-green-500 focus:border-green-500 bg-gray-50"
                                        >
                                            <option value="null">Unchanged</option>
                                            <option value="true">Set to True (Add)</option>
                                            <option value="false">Set to False (Remove)</option>
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowBulkUpdateModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isBulkUpdating} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {isBulkUpdating ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Updating...
                                        </>
                                    ) : "Apply Update"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- NEW: CONFIRMATION MODAL --- */}
            {confirmAction.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 transform transition-all">
                        <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white ${confirmAction.actionType === 'approve' ? 'border-green-100' : 'border-red-100'}`}>
                            <h3 className={`text-lg font-bold flex items-center gap-2 ${confirmAction.actionType === 'approve' ? 'text-green-700' : 'text-red-700'}`}>
                                {confirmAction.actionType === 'approve' ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                )}
                                {confirmAction.actionType === 'approve' ? 'Approve Resident(s)?' : 'Deny Resident(s)?'}
                            </h3>
                            <button onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 leading-relaxed mb-6">
                                {confirmAction.actionType === 'approve' 
                                    ? `Are you sure you want to approve ${confirmAction.isBulk ? selectedRows.length : 'this'} resident${confirmAction.isBulk && selectedRows.length > 1 ? 's' : ''}? They will be officially added to the directory.`
                                    : (
                                        <>
                                            Are you sure you want to deny {confirmAction.isBulk ? selectedRows.length : 'this'} resident{confirmAction.isBulk && selectedRows.length > 1 ? 's' : ''}? 
                                            <strong className="text-red-600 block mt-2">This will permanently delete their pending record from the system.</strong>
                                        </>
                                    )}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setConfirmAction({ ...confirmAction, isOpen: false })} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button 
                                    onClick={executeConfirmAction} 
                                    disabled={isConfirming} 
                                    className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 ${confirmAction.actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    {isConfirming ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Processing...
                                        </>
                                    ) : (
                                        confirmAction.actionType === 'approve' ? 'Yes, Approve' : 'Yes, Deny & Delete'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {importResults && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">Import Results</h3>
                            <button onClick={() => setImportResults(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="mb-4 text-green-700 font-semibold bg-green-50 p-3 rounded-lg border border-green-200">
                                {importResults.message}
                            </div>
                            {importResults.errors && importResults.errors.length > 0 && (
                                <div>
                                    <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        {importResults.errors.length} Errors Found
                                    </h4>
                                    <ul className="text-xs text-red-600 space-y-1 font-mono bg-red-50 p-3 rounded-lg border border-red-100">
                                        {importResults.errors.map((err, i) => (
                                            <li key={i}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                            <button onClick={() => setImportResults(null)} className="px-5 py-2 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-800 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <ResidentModal 
                    mode={modalMode}
                    resident={selectedResident}
                    households={householdOptions}
                    onClose={() => {
                        setIsModalOpen(false);
                        setIsConfirmingSave(false);
                        setPendingResidentData(null);
                    }}
                    onSave={(formData) => {
                        setPendingResidentData(formData);
                        setIsConfirmingSave(true);
                    }}
                />
            )}

            {isConfirmingSave && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Save Resident Changes?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to {modalMode === 'edit' ? 'update this resident' : 'add this new resident'}?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsConfirmingSave(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={executeSaveResident} className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                    Yes, Save
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

                        {isConfirmingBulkDelete && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete {selectedRows.length} Residents?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to permanently delete these {selectedRows.length} residents from the registry? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsConfirmingBulkDelete(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={executeBulkDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    Yes, Delete All
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isConfirmingBulkUpdate && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Update Welfare?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to apply these welfare updates to {selectedRows.length} residents?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsConfirmingBulkUpdate(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={executeBulkUpdate} className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                                    Yes, Apply Updates
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {residentToDelete && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Resident?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to permanently delete this resident from the registry? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setResidentToDelete(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={executeDeleteResident} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* F-024: Feedback Modal for queue submission */}
            {submissionFeedback.isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-green-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">{submissionFeedback.title}</h2>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                {submissionFeedback.message}
                            </p>
                            <button 
                                onClick={() => setSubmissionFeedback({ isOpen: false, title: '', message: '' })} 
                                className="w-full px-4 py-2.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}