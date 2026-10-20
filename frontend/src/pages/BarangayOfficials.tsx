import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from '../components/AuthContext';
import { User, Plus, Pencil, Trash2, X, Image as ImageIcon, Upload, Users, Layers, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

export interface OfficialTab {
    id: number;
    name: string;
    description?: string;
    order: number;
    is_active: boolean;
    officials_count?: number;
}

export interface BarangayOfficial {
    id: number;
    tab: number | null;
    tab_name?: string;
    name: string;
    position: string;
    committee: string;
    contact_number: string;
    image: string | null;
    order: number;
    is_active: boolean;
}

export default function BarangayOfficials() {
    const auth = useContext(AuthContext);
    
    // Check if the user is an admin
    const userRole = auth?.user?.role || (auth?.user?.roles && auth?.user?.roles[0]) || '';
    const canEdit = userRole.toUpperCase() === 'ADMIN';

    // Data States
    const [tabs, setTabs] = useState<OfficialTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<number | 'all'>('all');
    const [officials, setOfficials] = useState<BarangayOfficial[]>([]);
    const [loading, setLoading] = useState(true);

    // Scroll and Wheel Navigation for Tabs
    const tabContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(false);

    const checkScrollButtons = useCallback(() => {
        const el = tabContainerRef.current;
        if (el) {
            const { scrollLeft, scrollWidth, clientWidth } = el;
            setShowLeftArrow(scrollLeft > 6);
            setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 6);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(checkScrollButtons, 100);
        window.addEventListener('resize', checkScrollButtons);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScrollButtons);
        };
    }, [tabs, checkScrollButtons]);

    const handleTabWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        const el = tabContainerRef.current;
        if (!el) return;
        // Translate vertical mouse wheel to horizontal scroll without needing mouse drag or middle click
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            const { scrollWidth, clientWidth } = el;
            if (scrollWidth > clientWidth) {
                el.scrollLeft += e.deltaY;
                checkScrollButtons();
            }
        }
    };

    const scrollTabs = (direction: 'left' | 'right') => {
        const el = tabContainerRef.current;
        if (!el) return;
        const offset = direction === 'left' ? -220 : 220;
        el.scrollBy({ left: offset, behavior: 'smooth' });
        setTimeout(checkScrollButtons, 300);
    };

    const handleSelectTab = (tabId: number | 'all', event?: React.MouseEvent<HTMLElement>) => {
        setActiveTabId(tabId);
        if (event?.currentTarget) {
            event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    // Official Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOfficial, setEditingOfficial] = useState<BarangayOfficial | null>(null);
    const [formData, setFormData] = useState<{
        tab: string;
        name: string;
        position: string;
        committee: string;
        contact_number: string;
        order: string;
    }>({
        tab: '', name: '', position: 'Kagawad', committee: '', contact_number: '', order: '2'
    });
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [officialToDelete, setOfficialToDelete] = useState<BarangayOfficial | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmingSave, setIsConfirmingSave] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Tab Management Modal States
    const [isTabModalOpen, setIsTabModalOpen] = useState(false);
    const [editingTab, setEditingTab] = useState<OfficialTab | null>(null);
    const [tabFormData, setTabFormData] = useState<{
        name: string;
        description: string;
        order: string;
    }>({
        name: '', description: '', order: '0'
    });
    const [tabToDelete, setTabToDelete] = useState<OfficialTab | null>(null);
    const [isSavingTab, setIsSavingTab] = useState(false);
    const [isDeletingTab, setIsDeletingTab] = useState(false);

    // Fetch Tabs
    const fetchTabs = async () => {
        try {
            const res = await api.get('/api/official-tabs/');
            const tabList = res.data.results || res.data;
            setTabs(tabList);
            // Default active tab to the first tab if currently on 'all' or no active tab
            if (tabList.length > 0 && activeTabId === 'all') {
                setActiveTabId(tabList[0].id);
            }
            return tabList;
        } catch (error) {
            console.error("Error fetching tabs:", error);
            return [];
        }
    };

    // Fetch Officials
    const fetchOfficials = async () => {
        try {
            const res = await api.get('/api/barangay-officials/');
            setOfficials(res.data.results || res.data);
        } catch (error) {
            console.error("Error fetching officials:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            await fetchTabs();
            await fetchOfficials();
            setLoading(false);
        };
        initData();
    }, []);

    const getImageUrl = (imagePath: string | null) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_URL}${imagePath}`;
    };

    // --- Tab Modal Handlers ---
    const openTabModal = (tab: OfficialTab | null = null) => {
        setEditingTab(tab);
        if (tab) {
            setTabFormData({
                name: tab.name,
                description: tab.description || '',
                order: tab.order.toString()
            });
        } else {
            setTabFormData({
                name: '',
                description: '',
                order: (tabs.length).toString()
            });
        }
        setIsTabModalOpen(true);
    };

    const closeTabModal = () => {
        setIsTabModalOpen(false);
        setEditingTab(null);
    };

    const executeSaveTab = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tabFormData.name.trim()) {
            alert("Please enter a tab name.");
            return;
        }

        setIsSavingTab(true);
        try {
            const payload = {
                name: tabFormData.name.trim(),
                description: tabFormData.description.trim(),
                order: parseInt(tabFormData.order) || 0
            };

            let savedTab: OfficialTab;
            if (editingTab) {
                const res = await api.put(`/api/official-tabs/${editingTab.id}/`, payload);
                savedTab = res.data;
            } else {
                const res = await api.post('/api/official-tabs/', payload);
                savedTab = res.data;
            }

            const updatedTabs = await fetchTabs();
            await fetchOfficials();
            setActiveTabId(savedTab.id);
            closeTabModal();
        } catch (error) {
            console.error("Error saving tab:", error);
            alert("Failed to save tab. Please try again.");
        } finally {
            setIsSavingTab(false);
        }
    };

    const executeDeleteTab = async () => {
        if (!tabToDelete) return;
        setIsDeletingTab(true);
        try {
            await api.delete(`/api/official-tabs/${tabToDelete.id}/`);
            const updatedTabs = await fetchTabs();
            await fetchOfficials();
            
            // If the deleted tab was active, switch to first tab or 'all'
            if (activeTabId === tabToDelete.id) {
                setActiveTabId(updatedTabs.length > 0 ? updatedTabs[0].id : 'all');
            }
            setTabToDelete(null);
        } catch (error) {
            console.error("Error deleting tab:", error);
            alert("Failed to delete tab. Please try again.");
        } finally {
            setIsDeletingTab(false);
        }
    };

    // --- Official Modal Handlers ---
    const openModal = (official: BarangayOfficial | null = null) => {
        setEditingOfficial(official);
        if (official) {
            setFormData({
                tab: official.tab ? official.tab.toString() : (tabs[0]?.id ? tabs[0].id.toString() : ''),
                name: official.name,
                position: official.position,
                committee: official.committee || '',
                contact_number: official.contact_number || '',
                order: official.order.toString()
            });
            setImagePreview(getImageUrl(official.image));
        } else {
            // Default to currently active tab if on a specific tab, or first tab
            const defaultTabId = activeTabId !== 'all' ? activeTabId.toString() : (tabs[0]?.id ? tabs[0].id.toString() : '');
            setFormData({
                tab: defaultTabId,
                name: '',
                position: 'Kagawad',
                committee: '',
                contact_number: '',
                order: '2'
            });
            setImagePreview(null);
        }
        setImageFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingOfficial(null);
    };

    const executeSave = async () => {
        setIsSaving(true);
        const method = editingOfficial ? 'put' : 'post';
        const url = editingOfficial 
            ? `/api/barangay-officials/${editingOfficial.id}/`
            : `/api/barangay-officials/`;

        const data = new FormData();
        data.append('name', formData.name);
        data.append('position', formData.position);
        data.append('committee', formData.committee);
        data.append('contact_number', formData.contact_number);
        data.append('order', formData.order);
        if (formData.tab) {
            data.append('tab', formData.tab);
        }
        
        if (imageFile) {
            data.append('image', imageFile);
        }

        try {
            const res = await api({
                method,
                url,
                data
            });

            if (res.status >= 200 && res.status < 300) {
                await fetchOfficials();
                await fetchTabs();
                closeModal();
                setIsConfirmingSave(false);
            } else {
                alert("Failed to save official.");
            }
        } catch (error) {
            console.error("Error saving official:", error);
            alert("Error saving official. Please verify the input.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsConfirmingSave(true);
    };

    const executeDelete = async () => {
        if (!officialToDelete) return;
        setIsDeleting(true);
        try {
            const res = await api.delete(`/api/barangay-officials/${officialToDelete.id}/`);
            if (res.status >= 200 && res.status < 300) {
                await fetchOfficials();
                await fetchTabs();
                setOfficialToDelete(null);
            } else {
                alert("Failed to delete official.");
            }
        } catch (error) {
            console.error("Error deleting official:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const renderCard = (o: BarangayOfficial) => {
        return (
            <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center shadow-sm relative group transition-all hover:shadow-md hover:border-green-200">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mr-5 overflow-hidden shrink-0 border-2 border-gray-100 shadow-inner">
                    {o.image ? (
                        <img src={getImageUrl(o.image) || ''} alt={o.name} className="w-full h-full object-cover" />
                    ) : (
                        <User className="w-8 h-8 text-gray-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg truncate">{o.name}</h4>
                    <p className="text-sm font-semibold text-green-700">{o.position}</p>
                    {(o.committee || o.contact_number) && (
                        <div className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                            {o.committee && <p className="truncate">Com on {o.committee}</p>}
                            {o.contact_number && <p>{o.contact_number}</p>}
                        </div>
                    )}
                </div>
                
                {canEdit && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-gray-200 p-1 flex gap-1">
                        <button onClick={() => openModal(o)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setOfficialToDelete(o)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Filter and Sort Officials
    const sortedOfficials = [...officials].sort((a, b) => a.order - b.order);
    const displayedOfficials = activeTabId === 'all'
        ? sortedOfficials
        : sortedOfficials.filter(o => o.tab === activeTabId);

    const activeTab = tabs.find(t => t.id === activeTabId);

    return (
        <div className="h-full w-full flex flex-col bg-[#f4f7fa] overflow-y-auto text-gray-800 p-4 sm:p-6 md:p-8">
            <div className="max-w-6xl w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Barangay Officials</h1>
                        <p className="text-gray-600 text-sm">Directory of current barangay officials, council members, and committees</p>
                    </div>
                    {canEdit && (
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => openTabModal()} 
                                className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                                <Layers className="w-4 h-4 text-green-700" />
                                + New Tab
                            </button>
                            <button 
                                onClick={() => openModal()} 
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Official
                            </button>
                        </div>
                    )}
                </div>

                {/* Tabs Navigation Bar */}
                <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-8 relative flex items-center">
                    {/* Left Scroll Button */}
                    {showLeftArrow && (
                        <button
                            type="button"
                            onClick={() => scrollTabs('left')}
                            aria-label="Scroll tabs left"
                            className="absolute left-2 z-10 p-1.5 rounded-lg bg-white/95 hover:bg-gray-100 text-gray-700 shadow-md border border-gray-200 transition-all flex items-center justify-center backdrop-blur-sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}

                    {/* Scrollable Tabs List */}
                    <div
                        ref={tabContainerRef}
                        onWheel={handleTabWheel}
                        onScroll={checkScrollButtons}
                        className="flex items-center gap-2 overflow-x-auto w-full max-w-full pb-1 sm:pb-0 scrollbar-none scroll-smooth px-1"
                    >
                        {tabs.map((tab) => {
                            const count = officials.filter(o => o.tab === tab.id).length;
                            const isActive = activeTabId === tab.id;
                            return (
                                <div key={tab.id} className="relative group flex items-center shrink-0">
                                    <button
                                        onClick={(e) => handleSelectTab(tab.id, e)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                            isActive
                                                ? 'bg-green-700 text-white shadow-sm'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>{tab.name}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                            isActive ? 'bg-green-800 text-green-100' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {count}
                                        </span>
                                    </button>
                                    {canEdit && (
                                        <div className="hidden group-hover:flex items-center gap-0.5 ml-1 bg-white border border-gray-200 rounded-md p-0.5 shadow-sm">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openTabModal(tab); }}
                                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Tab Name"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            {tabs.length > 1 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setTabToDelete(tab); }}
                                                    className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Delete Tab"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => handleSelectTab('all', e)}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                                    activeTabId === 'all'
                                        ? 'bg-green-700 text-white shadow-sm'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                <span>All Officials</span>
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${
                                    activeTabId === 'all' ? 'bg-green-800 text-green-100' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {officials.length}
                                </span>
                            </button>
                        )}
                    </div>

                    {/* Right Scroll Button */}
                    {showRightArrow && (
                        <button
                            type="button"
                            onClick={() => scrollTabs('right')}
                            aria-label="Scroll tabs right"
                            className="absolute right-2 z-10 p-1.5 rounded-lg bg-white/95 hover:bg-gray-100 text-gray-700 shadow-md border border-gray-200 transition-all flex items-center justify-center backdrop-blur-sm"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-400">Loading directory...</div>
                ) : displayedOfficials.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-bold mb-1">
                            {activeTab ? `No Officials in "${activeTab.name}"` : 'No Officials Found'}
                        </h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto">
                            {activeTab ? `No barangay officials have been assigned to the ${activeTab.name} tab yet.` : 'There are no barangay officials recorded yet.'}
                        </p>
                        {canEdit && (
                            <button 
                                onClick={() => openModal()} 
                                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                            >
                                + Add Official to {activeTab ? activeTab.name : 'Directory'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-10">
                        {/* F-019: CAPTAIN / PUNONG BARANGAY (Order 0 or 1) */}
                        {displayedOfficials.filter(o => o.order <= 1).length > 0 && (
                            <div className="flex justify-center">
                                <div className="w-full max-w-md">
                                    {displayedOfficials.filter(o => o.order <= 1).map(renderCard)}
                                </div>
                            </div>
                        )}

                        {/* F-019: EACH DISTINCT HIERARCHY RANK GETS ITS OWN ROW */}
                        {Array.from(new Set(displayedOfficials.filter(o => o.order > 1).map(o => o.order)))
                            .sort((a, b) => a - b)
                            .map(rank => {
                                const rankOfficials = displayedOfficials.filter(o => o.order === rank);
                                return (
                                    <div key={rank}>
                                        <div className="flex justify-center mb-6 mt-2">
                                            <div className="h-px bg-gray-200 w-full max-w-2xl"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {rankOfficials.map(renderCard)}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* TAB MANAGEMENT MODAL (Create / Edit Tab) */}
            {isTabModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingTab ? 'Edit Council Tab' : 'Create New Council Tab'}
                            </h3>
                            <button onClick={closeTabModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={executeSaveTab} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Tab Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={tabFormData.name}
                                    onChange={e => setTabFormData({ ...tabFormData, name: e.target.value })}
                                    placeholder="e.g. Sangguniang Barangay, SK Council, Tanod"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Description (Optional)</label>
                                <textarea
                                    rows={2}
                                    value={tabFormData.description}
                                    onChange={e => setTabFormData({ ...tabFormData, description: e.target.value })}
                                    placeholder="Brief note or committee summary..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Display Order</label>
                                <input
                                    type="number"
                                    value={tabFormData.order}
                                    onChange={e => setTabFormData({ ...tabFormData, order: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Lower numbers appear first in the tab bar.</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeTabModal}
                                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingTab}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center justify-center min-w-[90px]"
                                >
                                    {isSavingTab ? 'Saving...' : (editingTab ? 'Save Changes' : 'Create Tab')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TAB DELETE CONFIRMATION MODAL */}
            {tabToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete "{tabToDelete.name}" Tab?</h3>
                            <p className="text-gray-500 text-sm">
                                {officials.filter(o => o.tab === tabToDelete.id).length > 0 ? (
                                    <>
                                        This tab currently contains <strong className="text-gray-800">{officials.filter(o => o.tab === tabToDelete.id).length} official(s)</strong>. Officials will remain in the database and can be reassigned to other tabs.
                                    </>
                                ) : (
                                    'Are you sure you want to delete this tab? This action cannot be undone.'
                                )}
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                            <button
                                onClick={() => setTabToDelete(null)}
                                disabled={isDeletingTab}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeDeleteTab}
                                disabled={isDeletingTab}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center min-w-[90px]"
                            >
                                {isDeletingTab ? 'Deleting...' : 'Delete Tab'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OFFICIAL MODAL (Add / Edit Official) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">{editingOfficial ? 'Edit Official' : 'Add New Official'}</h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <form id="officialForm" onSubmit={handleSave} className="space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 flex flex-col items-center justify-center overflow-hidden border border-gray-200 relative group cursor-pointer shrink-0">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-gray-400" />
                                        )}
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="w-5 h-5 text-white mb-1" />
                                            <span className="text-[9px] text-white font-bold uppercase">Upload</span>
                                        </div>
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">Profile Picture</h4>
                                        <p className="text-xs text-gray-500">Upload a clear photo.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Tab Assignment Dropdown */}
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                            Council / Committee Tab <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.tab}
                                            onChange={e => setFormData({ ...formData, tab: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500 bg-white"
                                            required
                                        >
                                            <option value="" disabled>Select a Tab</option>
                                            {tabs.map(tab => (
                                                <option key={tab.id} value={tab.id.toString()}>{tab.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-500 mt-1">Organizes this official under the chosen tab in the council directory.</p>
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={formData.name} 
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500" 
                                            required 
                                            placeholder="e.g. Juan Dela Cruz"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Position</label>
                                        <input 
                                            type="text" 
                                            value={formData.position} 
                                            onChange={e => setFormData({...formData, position: e.target.value})}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500" 
                                            required 
                                            placeholder="e.g. Kagawad"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Hierarchy Order</label>
                                        <input 
                                            type="number" 
                                            value={formData.order} 
                                            onChange={e => setFormData({...formData, order: e.target.value})}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500" 
                                            required 
                                        />
                                        <p className="text-[10px] text-gray-500 mt-1">0 or 1 = Captain, 2 = Kagawad, 3+ = Other Officials</p>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Committee (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={formData.committee} 
                                            onChange={e => setFormData({...formData, committee: e.target.value})}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500" 
                                            placeholder="e.g. Peace & Order"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Contact Number (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={formData.contact_number} 
                                            onChange={e => setFormData({...formData, contact_number: e.target.value})}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-green-500 focus:border-green-500" 
                                            placeholder="e.g. 09123456789"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button type="submit" form="officialForm" className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors">
                                {editingOfficial ? 'Save Changes' : 'Add Official'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE OFFICIAL MODAL */}
            {officialToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col animate-fade-in-down">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Official</h3>
                            <p className="text-gray-500 text-sm">
                                Are you sure you want to delete <span className="font-bold text-gray-800">{officialToDelete.name}</span>? This action cannot be undone.
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                            <button 
                                onClick={() => setOfficialToDelete(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={executeDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center min-w-[90px]"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SAVE OFFICIAL CONFIRMATION MODAL */}
            {isConfirmingSave && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 flex flex-col animate-fade-in-down">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Confirm Save</h3>
                            <p className="text-gray-500 text-sm">
                                Are you sure you want to save {editingOfficial ? 'these changes' : 'this new official'}?
                            </p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
                            <button 
                                onClick={() => setIsConfirmingSave(false)}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={executeSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center min-w-[90px]"
                            >
                                {isSaving ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}