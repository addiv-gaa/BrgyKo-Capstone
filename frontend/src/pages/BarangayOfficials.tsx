import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { User, Plus, Pencil, Trash2, X, Image as ImageIcon, Upload, Users } from 'lucide-react';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

interface BarangayOfficial {
    id: number;
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
    
    // Check if the user is a staff member
    const userRole = auth?.user?.role || (auth?.user?.roles && auth?.user?.roles[0]) || '';
    const canEdit = userRole.toUpperCase() === 'ADMIN' || userRole.toUpperCase() === 'CAPTAIN';

    const [officials, setOfficials] = useState<BarangayOfficial[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOfficial, setEditingOfficial] = useState<BarangayOfficial | null>(null);
    
    const [formData, setFormData] = useState<{
        name: string;
        position: string;
        committee: string;
        contact_number: string;
        order: string;
    }>({
        name: '', position: 'Kagawad', committee: '', contact_number: '', order: '2'
    });
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

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
        fetchOfficials();
    }, []);

    const getImageUrl = (imagePath: string | null) => {
        if (!imagePath) return null;
        if (imagePath.startsWith('http')) return imagePath;
        return `${API_URL}${imagePath}`;
    };

    const openModal = (official: BarangayOfficial | null = null) => {
        setEditingOfficial(official);
        if (official) {
            setFormData({
                name: official.name,
                position: official.position,
                committee: official.committee || '',
                contact_number: official.contact_number || '',
                order: official.order.toString()
            });
            setImagePreview(getImageUrl(official.image));
        } else {
            setFormData({
                name: '', position: 'Kagawad', committee: '', contact_number: '', order: '2'
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

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
                fetchOfficials();
                closeModal();
            } else {
                alert("Failed to save official.");
            }
        } catch (error) {
            console.error("Error saving official:", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this official?")) return;

        try {
            const res = await api.delete(`/api/barangay-officials/${id}/`);
            if (res.status >= 200 && res.status < 300) {
                fetchOfficials();
            } else {
                alert("Failed to delete official.");
            }
        } catch (error) {
            console.error("Error deleting official:", error);
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
                        <button onClick={() => handleDelete(o.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Sorting by order
    const sortedOfficials = [...officials].sort((a, b) => a.order - b.order);

    return (
        <div className="h-full w-full flex flex-col bg-[#f4f7fa] overflow-y-auto text-gray-800 p-8">
            <div className="max-w-6xl w-full mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Barangay Officials</h1>
                        <p className="text-gray-600 text-sm">Directory of current barangay officials</p>
                    </div>
                    {canEdit && (
                        <button 
                            onClick={() => openModal()} 
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Official
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64 text-gray-400">Loading officials...</div>
                ) : officials.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center shadow-sm">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-gray-900 font-bold mb-1">No Officials Found</h3>
                        <p className="text-gray-500 text-sm">There are no barangay officials recorded yet.</p>
                        {canEdit && (
                            <button onClick={() => openModal()} className="mt-4 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                                Add First Official
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedOfficials.map(renderCard)}
                    </div>
                )}
            </div>

            {/* MODAL */}
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
                                        <p className="text-[10px] text-gray-500 mt-1">1 = Captain, 2 = Kagawad</p>
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
        </div>
    );
}