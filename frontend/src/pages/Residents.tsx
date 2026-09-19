import React, { useState, useEffect, useMemo, useRef } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
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
    relationship_to_head: string;
    household?: number | null;
    is_4ps_beneficiary: boolean;
    is_senior_citizen: boolean;
    is_pwd: boolean;
    is_solo_parent: boolean;
}

// --- UI Helper Functions ---
const calculateAge = (dob: string | null) => {
    if (!dob) return 'N/A';
    const diff = Date.now() - new Date(dob).getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
};

export default function ResidentPage() {
    const [residents, setResidents] = useState<ResidentData[]>([]);
    const [householdOptions, setHouseholdOptions] = useState<{id: number, address: string}[]>([]);
    
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        purok: '',
        sex: '',
        civil_status: '',
        age_bracket: '',
        is_4ps: false,
        is_senior: false,
        is_pwd: false,
        is_solo: false
    });
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedResident, setSelectedResident] = useState<ResidentProperties | null>(null);

    // Upload & Export State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // NEW: Bulk Selection & Bulk Update State
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);
    const [bulkUpdateFlags, setBulkUpdateFlags] = useState({
        is_4ps_beneficiary: false,
        is_senior_citizen: false,
        is_pwd: false,
        is_solo_parent: false
    });

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const fetchResidents = async () => {
        try {
            const response = await fetch(`${API_URL}/api/residents/`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
                setResidents(data.results || data); 
                setSelectedRows([]); // Clear selections on fetch
            }
        } catch (error) {
            console.error("Network error fetching residents:", error);
        }
    };

    const fetchHouseholdsForDropdown = async () => {
        try {
            const response = await fetch(`${API_URL}/api/households/`, { headers: getAuthHeaders() });
            if (response.ok) {
                const data = await response.json();
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
        fetchResidents();
    }, []);

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
    const handleBulkDelete = async () => {
        if (selectedRows.length === 0) return;
        
        if (!window.confirm(`Are you sure you want to completely delete these ${selectedRows.length} residents? This action cannot be undone.`)) {
            return;
        }

        setIsBulkDeleting(true);
        try {
            const response = await fetch(`${API_URL}/api/residents/bulk_delete/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: selectedRows })
            });

            if (response.ok) {
                fetchResidents();
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Failed to bulk delete residents.");
            }
        } catch (error) {
            console.error("Network error during bulk delete:", error);
            alert("A network error occurred.");
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Bulk Update Welfare
    const handleBulkUpdateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRows.length === 0) return;

        setIsBulkUpdating(true);
        try {
            const response = await fetch(`${API_URL}/api/residents/bulk_update_welfare/`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: selectedRows, flags: bulkUpdateFlags })
            });

            if (response.ok) {
                setShowBulkUpdateModal(false);
                setSelectedRows([]); // Reset selection
                // Reset flags for next time
                setBulkUpdateFlags({ is_4ps_beneficiary: false, is_senior_citizen: false, is_pwd: false, is_solo_parent: false });
                fetchResidents();
            } else {
                const errorData = await response.json();
                alert(errorData.error || "Failed to update welfare statuses.");
            }
        } catch (error) {
            console.error("Network error during bulk update:", error);
            alert("A network error occurred.");
        } finally {
            setIsBulkUpdating(false);
        }
    };


    // --- Excel Upload Handler ---
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setIsUploading(true);
        const token = localStorage.getItem('access');

        try {
            const response = await fetch(`${API_URL}/api/residents/import-excel/`, {
                method: 'POST',
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                let alertMsg = data.message;
                if (data.errors && data.errors.length > 0) {
                    alertMsg += `\n\nHowever, ${data.errors.length} rows failed. Check console for details.`;
                    console.warn("Import Errors:", data.errors);
                }
                alert(alertMsg);
                fetchResidents();
            } else {
                alert(data.error || "Failed to import file.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Network error occurred during upload.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; 
        }
    };

    // --- Excel Export Handler ---
    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            const response = await fetch(`${API_URL}/api/residents/export_excel/`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error("Failed to export registry");

            const blob = await response.blob();
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

    const handleSaveResident = async (formData: Partial<ResidentProperties>) => {
        try {
            const method = modalMode === 'edit' ? 'PUT' : 'POST';
            const url = modalMode === 'edit' 
                ? `${API_URL}/api/residents/${selectedResident?.id}/` 
                : `${API_URL}/api/residents/`;

            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchResidents();
            } else {
                const errorData = await response.json();
                console.error("Validation Error:", errorData);
                alert("Failed to save. Check console for details.");
            }
        } catch (error) {
            console.error("Network error saving resident:", error);
            alert("Network error occurred.");
        }
    };

    const handleDeleteResident = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this resident?")) return;
        try {
            const response = await fetch(`${API_URL}/api/residents/${id}/`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (response.ok || response.status === 204) fetchResidents();
        } catch (error) {
            console.error("Network error deleting resident:", error);
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
            purok: '', sex: '', civil_status: '', age_bracket: '',
            is_4ps: false, is_senior: false, is_pwd: false, is_solo: false
        });
        setSearchQuery('');
    };

    const activeFilterCount = Object.values(filters).filter(val => val === true || (typeof val === 'string' && val !== '')).length;

    // Execute filter instantly
    const filteredResidents = useMemo(() => {
        return residents.filter(res => {
            const searchStr = searchQuery.toLowerCase();
            const matchesSearch = !searchQuery || 
                res.first_name.toLowerCase().includes(searchStr) || 
                res.last_name.toLowerCase().includes(searchStr) ||
                res.purok.toLowerCase().includes(searchStr);

            const matchesPurok = !filters.purok || res.purok === filters.purok;
            const matchesSex = !filters.sex || res.sex === filters.sex;
            const matchesCivil = !filters.civil_status || res.civil_status === filters.civil_status;

            let matchesAge = true;
            if (filters.age_bracket) {
                const age: any = calculateAge(res.birth_date);
                if (age === 'N/A') {
                    matchesAge = false;
                } else {
                    if (filters.age_bracket === '0-14') matchesAge = age >= 0 && age <= 14;
                    else if (filters.age_bracket === '15-30') matchesAge = age >= 15 && age <= 30;
                    else if (filters.age_bracket === '31-59') matchesAge = age >= 31 && age <= 59;
                    else if (filters.age_bracket === '60+') matchesAge = age >= 60;
                }
            }

            const matches4ps = !filters.is_4ps || res.is_4ps_beneficiary;
            const matchesSenior = !filters.is_senior || res.is_senior_citizen;
            const matchesPwd = !filters.is_pwd || res.is_pwd;
            const matchesSolo = !filters.is_solo || res.is_solo_parent;

            return matchesSearch && matchesPurok && matchesSex && matchesCivil && matchesAge && matches4ps && matchesSenior && matchesPwd && matchesSolo;
        });
    }, [residents, searchQuery, filters]);


    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Information</h1>
                            <p className="text-gray-500 text-sm">Barangay Census Database</p>
                        </div>
                        
                        <div className="flex gap-3">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            
                            <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                                {isUploading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Importing...
                                    </>
                                ) : <span>Import Excel</span>}
                            </button>

                            <button onClick={handleExportExcel} disabled={isExporting} className="bg-teal-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                                {isExporting ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Exporting...
                                    </>
                                ) : (
                                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg><span>Export Excel</span></>
                                )}
                            </button>

                            <button onClick={() => { setModalMode('add'); setSelectedResident(null); setIsModalOpen(true); }} className="bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-sm">
                                <span>+ Add Resident</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative">
                        
                        {/* FLOATING BULK ACTION BAR */}
                        {selectedRows.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-blue-600 text-white px-6 py-3 flex justify-between items-center z-10 animate-fade-in-down shadow-md">
                                <div className="font-semibold flex items-center gap-2">
                                    <span className="bg-white text-blue-700 px-2 py-0.5 rounded-md text-xs">{selectedRows.length}</span> 
                                    Residents Selected
                                </div>
                                <div className="flex gap-3 items-center">
                                    <button 
                                        onClick={() => setShowBulkUpdateModal(true)}
                                        className="bg-white text-blue-700 hover:bg-blue-50 px-4 py-1.5 rounded-md text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
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
                                    <div className="w-px h-6 bg-blue-400 mx-1"></div>
                                    <button onClick={() => setSelectedRows([])} className="text-white hover:text-blue-200 text-sm font-medium transition-colors">
                                        Clear Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Search & Filter Trigger Bar */}
                        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3 justify-between items-center bg-white">
                            <div className="relative flex-1 max-w-2xl">
                                <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" placeholder="Search by name or purok..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors" />
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 transition-colors ${showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                Filters {activeFilterCount > 0 && <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">{activeFilterCount}</span>}
                            </button>
                        </div>

                        {/* Expandable Filter Panel */}
                        {showFilters && (
                            <div className="bg-gray-50 p-5 border-b border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Purok / Zone</label>
                                        <select name="purok" value={filters.purok} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                            <option value="">All Puroks</option>
                                            {uniquePuroks.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Age Bracket</label>
                                        <select name="age_bracket" value={filters.age_bracket} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white">
                                            <option value="">All Ages</option>
                                            <option value="0-14">0 - 14 (Children)</option>
                                            <option value="15-30">15 - 30 (Youth/SK)</option>
                                            <option value="31-59">31 - 59 (Working Age)</option>
                                            <option value="60+">60+ (Senior Citizens)</option>
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
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-red-50 hover:border-red-200 transition-colors">
                                            <input type="checkbox" name="is_4ps" checked={filters.is_4ps} onChange={handleFilterChange} className="w-4 h-4 text-red-600 rounded" />
                                            <span className="font-medium text-gray-700">4Ps Beneficiary</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-orange-50 hover:border-orange-200 transition-colors">
                                            <input type="checkbox" name="is_senior" checked={filters.is_senior} onChange={handleFilterChange} className="w-4 h-4 text-orange-600 rounded" />
                                            <span className="font-medium text-gray-700">Senior Citizen</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-blue-50 hover:border-blue-200 transition-colors">
                                            <input type="checkbox" name="is_pwd" checked={filters.is_pwd} onChange={handleFilterChange} className="w-4 h-4 text-blue-600 rounded" />
                                            <span className="font-medium text-gray-700">PWD</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-full border border-gray-200 text-sm hover:bg-green-50 hover:border-green-200 transition-colors">
                                            <input type="checkbox" name="is_solo" checked={filters.is_solo} onChange={handleFilterChange} className="w-4 h-4 text-green-600 rounded" />
                                            <span className="font-medium text-gray-700">Solo Parent</span>
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
                            <div className="bg-blue-50 px-4 py-2 border-b border-blue-100 flex flex-wrap gap-2 items-center text-sm">
                                <span className="text-blue-800 font-semibold mr-2 text-xs uppercase tracking-wide">Active Filters:</span>
                                {filters.purok && <span className="bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Purok: {filters.purok}</span>}
                                {filters.age_bracket && <span className="bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Age: {filters.age_bracket}</span>}
                                {filters.sex && <span className="bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Sex: {filters.sex}</span>}
                                {filters.civil_status && <span className="bg-white border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Civil Status: {filters.civil_status}</span>}
                                {filters.is_4ps && <span className="bg-red-100 border border-red-200 text-red-700 px-2 py-1 rounded-full text-xs font-bold">4Ps Only</span>}
                                {filters.is_senior && <span className="bg-orange-100 border border-orange-200 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">Seniors Only</span>}
                                {filters.is_pwd && <span className="bg-blue-100 border border-blue-200 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">PWD Only</span>}
                                {filters.is_solo && <span className="bg-green-100 border border-green-200 text-green-700 px-2 py-1 rounded-full text-xs font-bold">Solo Parents Only</span>}
                                <span className="ml-auto text-blue-600 font-bold text-xs">{filteredResidents.length} Results</span>
                            </div>
                        )}

                        {/* Result Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap min-w-max">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4 w-10 sticky left-0 bg-gray-50 z-10">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                checked={filteredResidents.length > 0 && selectedRows.length === filteredResidents.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4">Inhabitant Type</th>
                                        <th className="px-6 py-4">Last Name</th>
                                        <th className="px-6 py-4">First Name</th>
                                        <th className="px-6 py-4">Middle Name</th>
                                        <th className="px-6 py-4">Suffix</th>
                                        <th className="px-6 py-4">Birth Place</th>
                                        <th className="px-6 py-4">Birthdate</th>
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
                                        <th className="px-6 py-4">Welfare Status</th>
                                        <th className="px-6 py-4 text-center sticky right-0 bg-gray-50 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {filteredResidents.length > 0 ? filteredResidents.map((resident) => {
                                        const isSelected = selectedRows.includes(resident.id);
                                        return (
                                            <tr key={resident.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                                <td className="px-6 py-4 sticky left-0 bg-inherit z-10">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(resident.id)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">{resident.inhabitant_type || '-'}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{resident.last_name}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{resident.first_name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.middle_name || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.suffix || '-'}</td>
                                                
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.birth_place || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.birth_date || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.sex}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.civil_status}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.citizenship || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.occupation || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.contact_number || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.email_address || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.highest_education || '-'}</td>
                                                
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.mothers_first_name || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.mothers_middle_name || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{resident.mothers_last_name || '-'}</td>
                                                
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1 w-32">
                                                        {resident.is_4ps_beneficiary && <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-red-200">4Ps</span>}
                                                        {resident.is_senior_citizen && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-orange-200">Senior</span>}
                                                        {resident.is_pwd && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">PWD</span>}
                                                        {resident.is_solo_parent && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">Solo Parent</span>}
                                                        {!resident.is_4ps_beneficiary && !resident.is_senior_citizen && !resident.is_pwd && !resident.is_solo_parent && <span className="text-gray-400 text-xs">-</span>}
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center sticky right-0 bg-inherit shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => { setModalMode('view'); setSelectedResident(resident as any); setIsModalOpen(true); }} className="p-1.5 border border-gray-200 rounded text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors bg-white" title="View Details">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        </button>
                                                        <button onClick={() => { setModalMode('edit'); setSelectedResident(resident as any); setIsModalOpen(true); }} className="p-1.5 border border-gray-200 rounded text-amber-500 hover:bg-amber-50 hover:text-amber-700 transition-colors bg-white" title="Edit Details">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        <button className="p-1.5 bg-[#ef4444] text-white rounded hover:bg-red-600 shadow-sm transition-colors" title="Delete Resident" onClick={() => handleDeleteResident(resident.id)}>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={20} className="px-6 py-8 text-center text-gray-500 italic">
                                                No residents match the selected filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                                    Set the welfare statuses for the <strong className="text-blue-600">{selectedRows.length} selected residents</strong>. This will overwrite their current flags.
                                </p>
                                
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" checked={bulkUpdateFlags.is_4ps_beneficiary} onChange={e => setBulkUpdateFlags({...bulkUpdateFlags, is_4ps_beneficiary: e.target.checked})} className="w-4 h-4 text-red-600 rounded cursor-pointer" />
                                    <span className="font-semibold text-gray-800">4Ps Beneficiary</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" checked={bulkUpdateFlags.is_senior_citizen} onChange={e => setBulkUpdateFlags({...bulkUpdateFlags, is_senior_citizen: e.target.checked})} className="w-4 h-4 text-orange-600 rounded cursor-pointer" />
                                    <span className="font-semibold text-gray-800">Senior Citizen</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" checked={bulkUpdateFlags.is_pwd} onChange={e => setBulkUpdateFlags({...bulkUpdateFlags, is_pwd: e.target.checked})} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                    <span className="font-semibold text-gray-800">PWD</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <input type="checkbox" checked={bulkUpdateFlags.is_solo_parent} onChange={e => setBulkUpdateFlags({...bulkUpdateFlags, is_solo_parent: e.target.checked})} className="w-4 h-4 text-green-600 rounded cursor-pointer" />
                                    <span className="font-semibold text-gray-800">Solo Parent</span>
                                </label>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowBulkUpdateModal(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isBulkUpdating} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
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

            {isModalOpen && (
                <ResidentModal 
                    mode={modalMode}
                    resident={selectedResident}
                    households={householdOptions}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveResident}
                />
            )}
        </div>
    );
}