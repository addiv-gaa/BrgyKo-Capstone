import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../components/AuthContext";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/header";

const API_URL = import.meta.env.VITE_API_URL;

export default function AnnouncementPage() {
    const auth = useContext(AuthContext);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ title: '', content: '', category: 'Emergency' });

    const isStaff = ['admin', 'staff'].some(r => auth?.user?.roles?.includes(r));

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        const token = localStorage.getItem('access');
        const res = await fetch(`${API_URL}/api/announcements/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setAnnouncements(await res.json());
        setIsLoading(false);
    };

    const createAnnouncement = async () => {
        const token = localStorage.getItem('access');
        const res = await fetch(`${API_URL}/api/announcements/`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            setIsModalOpen(false);
            setFormData({ title: '', content: '', category: 'Emergency' });
            fetchAnnouncements();
        }
    };

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('access');
        await fetch(`${API_URL}/api/announcements/${id}/mark_as_read/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchAnnouncements();
    };

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
                            <p className="text-gray-500 text-sm">Official barangay advisories and news</p>
                        </div>
                        {isStaff && (
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
                            >
                                + Create Announcement
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {announcements.map((ann) => (
                            <div key={ann.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg">{ann.title}</h3>
                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{ann.category}</span>
                                    </div>
                                    <p className="text-gray-600 mb-4">{ann.content}</p>
                                    <p className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</p>
                                </div>
                                {!isStaff && !ann.is_read && (
                                    <button onClick={() => markAsRead(ann.id)} className="text-sm text-blue-600 hover:text-blue-800 font-semibold border border-blue-600 px-3 py-1 rounded">
                                        Mark as Read
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Create Announcement Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Create Announcement</h2>
                        <div className="space-y-4">
                            <input className="w-full border p-2 rounded" placeholder="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                            <textarea className="w-full border p-2 rounded" placeholder="Content" rows={4} value={formData.content} onChange={(e) => setFormData({...formData, content: e.target.value})} />
                            <select className="w-full border p-2 rounded" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                                {['Emergency', 'Event', 'Welfare', 'Services', 'SK'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="flex gap-2 justify-end mt-4">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                                <button onClick={createAnnouncement} className="bg-blue-600 text-white px-4 py-2 rounded">Publish</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}