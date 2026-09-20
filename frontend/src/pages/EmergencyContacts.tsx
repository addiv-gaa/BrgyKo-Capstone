import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { jwtDecode } from 'jwt-decode';
import { Building, Heart, Shield, AlertTriangle, Users, Info, PhoneCall, Plus, Pencil, Trash2, X, Activity } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface CustomJwtPayload {
    exp?: number;
    roles?: string[];
    role?: string;
    first_name?: string;
    username?: string;
}

interface EmergencyContact {
    id: number;
    name: string;
    description: string;
    category: 'Barangay' | 'Municipal' | 'National';
    phone: string;
    icon: string;
    order: number;
}

const ICONS: Record<string, React.ReactNode> = {
    building: <Building className="w-5 h-5" />,
    heart: <Heart className="w-5 h-5" />,
    shield: <Shield className="w-5 h-5" />,
    alert: <AlertTriangle className="w-5 h-5" />,
    users: <Users className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    phone: <PhoneCall className="w-5 h-5" />,
    activity: <Activity className="w-5 h-5" />
};

export default function EmergencyContacts() {
    const auth = useContext(AuthContext);
    
    // Check if the user is a staff member
    const token = localStorage.getItem('access');
    let userRole = '';
    
    if (token) {
        try {
            const decoded = jwtDecode<CustomJwtPayload>(token);
            userRole = decoded.role || (decoded.roles && decoded.roles[0]) || '';
        } catch (e) {
            console.error("Error parsing token", e);
        }
    }
    
    // Any role other than RESIDENT is considered staff
    const isStaff = userRole && userRole.toUpperCase() !== 'RESIDENT';

    const [contacts, setContacts] = useState<EmergencyContact[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
    const [formData, setFormData] = useState<Partial<EmergencyContact>>({});

    const fetchContacts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/emergency-contacts/`);
            if (res.ok) {
                const data = await res.json();
                setContacts(data.results || data);
            }
        } catch (error) {
            console.error("Error fetching contacts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const openModal = (contact: EmergencyContact | null = null) => {
        setEditingContact(contact);
        if (contact) {
            setFormData(contact);
        } else {
            setFormData({
                category: 'Barangay',
                icon: 'phone',
                order: 0,
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingContact(null);
        setFormData({});
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        const method = editingContact ? 'PUT' : 'POST';
        const url = editingContact 
            ? `${API_URL}/api/emergency-contacts/${editingContact.id}/`
            : `${API_URL}/api/emergency-contacts/`;

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                fetchContacts();
                closeModal();
            } else {
                alert("Failed to save contact.");
            }
        } catch (error) {
            console.error("Error saving contact:", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!token || !confirm("Are you sure you want to delete this contact?")) return;

        try {
            const res = await fetch(`${API_URL}/api/emergency-contacts/${id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                fetchContacts();
            } else {
                alert("Failed to delete contact.");
            }
        } catch (error) {
            console.error("Error deleting contact:", error);
        }
    };

    // Group contacts
    const barangay = contacts.filter(c => c.category === 'Barangay');
    const municipal = contacts.filter(c => c.category === 'Municipal');
    const national = contacts.filter(c => c.category === 'National');

    const renderCard = (c: EmergencyContact, colorType: 'blue' | 'green' | 'red') => {
        const bgClasses = {
            blue: 'bg-blue-50 text-blue-700',
            green: 'bg-green-50 text-green-700',
            red: 'bg-red-50 text-red-700'
        };
        const textClasses = {
            blue: 'text-blue-800',
            green: 'text-green-800',
            red: 'text-red-700'
        };

        return (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center shadow-sm relative group transition-colors hover:border-gray-300">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${bgClasses[colorType]}`}>
                    {ICONS[c.icon] || <PhoneCall className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{c.name}</h4>
                    <p className="text-xs text-gray-500 truncate">{c.description}</p>
                </div>
                <div className={`font-bold text-sm ml-4 ${textClasses[colorType]} shrink-0`}>
                    {c.phone}
                </div>
                
                {isStaff && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-gray-200 p-1 flex gap-1">
                        <button onClick={() => openModal(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#f4f7fa] overflow-y-auto text-gray-800 p-8">
            <div className="max-w-6xl w-full mx-auto">
                {/* Header */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Emergency Contacts</h1>
                        <p className="text-gray-600 text-sm">Barangay, municipal, and national emergency hotlines</p>
                    </div>
                    {isStaff && (
                        <button 
                            onClick={() => openModal()} 
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Add Contact
                        </button>
                    )}
                </div>

                {/* SOS Banner */}
                <div className="bg-[#b91c1c] rounded-xl p-5 mb-8 flex items-center text-white shadow-md">
                    <div className="bg-white/20 px-3 py-1.5 rounded-md font-bold text-xl mr-4 border border-white/30 backdrop-blur-sm">
                        SOS
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Emergency: Call 911</h2>
                        <p className="text-red-100 text-sm">For life-threatening situations, accidents, or major crimes</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    </div>
                ) : (
                    <div className="space-y-8 pb-12">
                        {/* Barangay Contacts */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-[#1e3a8a]"></div>
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Barangay Contacts</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {barangay.map(c => renderCard(c, 'blue'))}
                                {barangay.length === 0 && <p className="text-sm text-gray-500 italic col-span-2">No contacts added yet.</p>}
                            </div>
                        </div>

                        {/* Municipal Contacts */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-green-700"></div>
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Municipal / City Contacts</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {municipal.map(c => renderCard(c, 'green'))}
                                {municipal.length === 0 && <p className="text-sm text-gray-500 italic col-span-2">No contacts added yet.</p>}
                            </div>
                        </div>

                        {/* National Hotlines */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wide">National Hotlines</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {national.map(c => renderCard(c, 'red'))}
                                {national.length === 0 && <p className="text-sm text-gray-500 italic col-span-2">No contacts added yet.</p>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-lg font-bold text-gray-900">
                                {editingContact ? 'Edit Contact' : 'Add Contact'}
                            </h2>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Category</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={formData.category || 'Barangay'}
                                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                                >
                                    <option value="Barangay">Barangay Contacts</option>
                                    <option value="Municipal">Municipal / City Contacts</option>
                                    <option value="National">National Hotlines</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Name</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. Barangay Hall"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Description</label>
                                <input 
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="e.g. Main office, permits, clearances"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Phone / Hotline</label>
                                <input 
                                    type="text"
                                    required
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    placeholder="e.g. (02) 8123-4567 or 911"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">Icon</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={formData.icon || 'phone'}
                                    onChange={(e) => setFormData({...formData, icon: e.target.value})}
                                >
                                    <option value="phone">Phone</option>
                                    <option value="building">Building</option>
                                    <option value="heart">Heart (Health/Medical)</option>
                                    <option value="shield">Shield (Police/Security)</option>
                                    <option value="alert">Alert (Fire/Emergency)</option>
                                    <option value="users">Users (Welfare/Social)</option>
                                    <option value="info">Info</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
                                >
                                    Save Contact
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}