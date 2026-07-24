import React, { useState, useEffect } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

const API_URL = import.meta.env.VITE_API_URL;

// --- Icons ---
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const ArchiveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

const DOCUMENT_TYPES = ['Ordinance', 'Resolution', 'EO', 'Memo', 'Minutes', 'Financial', 'Template', 'Others'];

// Security Constraints
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx';

export default function Documents() {
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // View States
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    
    // Pagination & Sorting States
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState("uploaded_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Form Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [formMode, setFormMode] = useState<'upload' | 'edit'>('upload');
    const [currentDocId, setCurrentDocId] = useState<number | null>(null);
    const [formState, setFormState] = useState<{title: string, type: string, file: File | null}>({ title: "", type: "Memo", file: null });
    const [isSaving, setIsSaving] = useState(false);

    // --- Data Fetching ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => { fetchDocuments(); }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, filterType, showArchived, page, sortField, sortOrder]);

    const fetchDocuments = async () => {
        const token = localStorage.getItem('access');
        if (!token) return;

        const ordering = sortOrder === 'desc' ? `-${sortField}` : sortField;
        let url = `${API_URL}/api/official-documents/?page=${page}&ordering=${ordering}&is_archived=${showArchived ? 'True' : 'False'}`;
        
        if (searchQuery) url += `&search=${searchQuery}`;
        if (filterType) url += `&document_type=${filterType}`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` }});
            if (response.ok) {
                const data = await response.json();
                // DRF Paginator returns an object with 'results' and 'count'
                setDocuments(data.results);
                setTotalPages(Math.ceil(data.count / 10)); // 10 is the page_size we set in Django
                setSelectedIds([]); // Clear selections on page change
            }
        } catch (error) {
            console.error("Error fetching documents:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Sorting Logic ---
    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("asc");
        }
    };

    // --- Bulk Selection Logic ---
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedIds(documents.map(d => d.id));
        else setSelectedIds([]);
    };

    const handleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
        else setSelectedIds([...selectedIds, id]);
    };

    // --- File Validation ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.size > MAX_FILE_SIZE) {
                alert("File size exceeds 10MB limit.");
                e.target.value = ''; 
                return;
            }
            setFormState({ ...formState, file });
        }
    };

    // --- Create / Update Action ---
    const openEditModal = (doc: any) => {
        setFormMode('edit');
        setCurrentDocId(doc.id);
        setFormState({ title: doc.title, type: doc.document_type, file: null }); // Don't enforce file upload on edit
        setIsFormModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formMode === 'upload' && !formState.file) {
            alert("Please attach a file to upload.");
            return;
        }

        setIsSaving(true);
        const token = localStorage.getItem('access');
        
        const formData = new FormData();
        formData.append('title', formState.title);
        formData.append('document_type', formState.type);
        if (formState.file) formData.append('file', formState.file);

        const method = formMode === 'edit' ? 'PATCH' : 'POST';
        const url = formMode === 'edit' 
            ? `${API_URL}/api/official-documents/${currentDocId}/`
            : `${API_URL}/api/official-documents/`;

        try {
            const response = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (response.ok) {
                setIsFormModalOpen(false);
                setFormState({ title: "", type: "Memo", file: null });
                fetchDocuments();
            } else alert("Action failed.");
        } catch (error) {
            console.error("Error saving document:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // --- Archive & Delete Actions ---
    const handleToggleArchive = async (id: number, currentStatus: boolean) => {
        const token = localStorage.getItem('access');
        await fetch(`${API_URL}/api/official-documents/${id}/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_archived: !currentStatus })
        });
        fetchDocuments();
    };

    const handleBulkAction = async (action: 'archive' | 'delete') => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to ${action} ${selectedIds.length} items?`)) return;

        const token = localStorage.getItem('access');
        await fetch(`${API_URL}/api/official-documents/bulk_${action}/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: selectedIds })
        });
        fetchDocuments();
    };

    const getBadgeColor = (type: string) => {
        switch(type) {
            case 'Ordinance': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Resolution': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'Financial': return 'bg-green-100 text-green-700 border-green-200';
            case 'Memo': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'EO': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="shrink-0 w-full"><PageHeader /></div>
            
            <div className="flex flex-1 overflow-hidden">
                <div className="shrink-0 h-full"><Sidebar /></div>
                
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    <div className="w-full">
                        
                        {/* Page Header & Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Document Repository</h1>
                                <p className="text-gray-500 text-sm">Manage and access official barangay files and records.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => { setPage(1); setShowArchived(!showArchived); }}
                                    className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${showArchived ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    {showArchived ? "Viewing Archives" : "View Archives"}
                                </button>
                                <button 
                                    onClick={() => { setFormMode('upload'); setFormState({title: "", type: "Memo", file: null}); setIsFormModalOpen(true); }}
                                    className="bg-[#1c4ed8] hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors"
                                >
                                    + Upload Document
                                </button>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white p-4 rounded-t-lg border border-gray-200 border-b-0 flex flex-col sm:flex-row gap-4 shadow-sm items-center justify-between">
                            <div className="flex w-full gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><SearchIcon /></div>
                                    <input 
                                        type="text" 
                                        placeholder="Search documents by title..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm"
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <select 
                                        value={filterType} 
                                        onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                                        className="block w-full pl-3 pr-10 py-2 border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-600 sm:text-sm rounded-md"
                                    >
                                        <option value="">All Categories</option>
                                        {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {/* Bulk Actions Menu (Visible when items selected) */}
                            {selectedIds.length > 0 && (
                                <div className="flex gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                    <span className="text-sm font-bold text-blue-800 mr-2 self-center">{selectedIds.length} Selected</span>
                                    <button onClick={() => handleBulkAction('archive')} className="text-xs font-semibold px-2 py-1 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-100">Archive</button>
                                    <button onClick={() => handleBulkAction('delete')} className="text-xs font-semibold px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                                </div>
                            )}
                        </div>

                        {/* Data Table */}
                        <div className="bg-white border border-gray-200 rounded-b-lg shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                            <div className="overflow-x-auto flex-1">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 select-none">
                                        <tr>
                                            <th className="px-6 py-3 text-left w-10">
                                                <input type="checkbox" onChange={handleSelectAll} checked={documents.length > 0 && selectedIds.length === documents.length} className="rounded text-blue-600" />
                                            </th>
                                            <th onClick={() => handleSort('title')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                Document Name {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th onClick={() => handleSort('document_type')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                Type {sortField === 'document_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Uploaded By</th>
                                            <th onClick={() => handleSort('uploaded_at')} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase cursor-pointer hover:text-gray-700">
                                                Date {sortField === 'uploaded_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {isLoading ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading documents...</td></tr>
                                        ) : documents.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No documents found matching your criteria.</td></tr>
                                        ) : (
                                            documents.map((doc) => (
                                                <tr key={doc.id} className={`transition-colors ${doc.is_archived ? 'bg-gray-50 opacity-75' : 'hover:bg-blue-50/30'}`}>
                                                    <td className="px-6 py-4">
                                                        <input type="checkbox" checked={selectedIds.includes(doc.id)} onChange={() => handleSelectOne(doc.id)} className="rounded text-blue-600" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center">
                                                            <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                                                                <FileIcon />
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-gray-900">{doc.title}</div>
                                                                <div className="text-xs text-gray-500 truncate max-w-[200px]" title={doc.file_name}>{doc.file_name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getBadgeColor(doc.document_type)}`}>
                                                            {doc.document_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{doc.uploaded_by_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            {/* CHANGED: Open preview securely in a new tab */}
                                                            <button onClick={() => window.open(doc.file, '_blank', 'noopener,noreferrer')} className="text-blue-600 bg-blue-50 p-2 rounded hover:bg-blue-100" title="Preview">
                                                                <EyeIcon />
                                                            </button>
                                                            <a href={doc.file} download className="text-green-600 bg-green-50 p-2 rounded hover:bg-green-100" title="Download">
                                                                <DownloadIcon />
                                                            </a>
                                                            <button onClick={() => openEditModal(doc)} className="text-amber-600 bg-amber-50 p-2 rounded hover:bg-amber-100" title="Edit">
                                                                <EditIcon />
                                                            </button>
                                                            <button onClick={() => handleToggleArchive(doc.id, doc.is_archived)} className="text-gray-600 bg-gray-100 p-2 rounded hover:bg-gray-200" title={doc.is_archived ? "Restore" : "Archive"}>
                                                                <ArchiveIcon />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
                                    <div className="flex gap-2">
                                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50">Previous</button>
                                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border border-gray-300 rounded bg-white text-sm disabled:opacity-50">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </main>
            </div>

            {/* Form Modal (Upload & Edit) */}
            {isFormModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-900">{formMode === 'upload' ? 'Upload Document' : 'Edit Document Details'}</h2>
                            <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                                <input 
                                    type="text" required value={formState.title}
                                    onChange={(e) => setFormState({...formState, title: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select 
                                    value={formState.type} onChange={(e) => setFormState({...formState, type: e.target.value})}
                                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                                >
                                    {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {formMode === 'edit' ? 'Replace File (Optional)' : 'File Attachment'}
                                </label>
                                <input 
                                    type="file" 
                                    accept={ALLOWED_EXTENSIONS}
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-300 rounded-md p-1"
                                />
                                <p className="text-xs text-gray-500 mt-1">Max size: 10MB. Allowed: PDF, Word, Excel.</p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md">Cancel</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-[#1c4ed8] rounded-md disabled:opacity-50">
                                    {isSaving ? "Saving..." : "Save Document"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}