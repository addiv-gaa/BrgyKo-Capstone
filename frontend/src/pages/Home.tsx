import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../components/AuthContext";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/header";
import StatCard from "../components/statcard";

const API_URL = import.meta.env.VITE_API_URL;

// --- Icons ---
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FileBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M7 16.5 8 22l-3-1-3 1 1-5.5"/></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const HeartHandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;

export default function Home() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [stats, setStats] = useState({ 
        total_residents: 0, 
        certs_this_month: 0, 
        pending_reservations: 0, 
        pending_documents: 0,
        welfare_beneficiaries: 0, 
        sk_programs: 0, 
        chatbot_queries: 0 
    });
    
    // Resident States
    const [residentCerts, setResidentCerts] = useState<any[]>([]);
    const [residentPermits, setResidentPermits] = useState<any[]>([]);
    const [residentReservations, setResidentReservations] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);

    const canViewAdminMenu = ['admin', 'staff'].some(role => auth?.user?.roles?.includes(role));
    const displayName = auth?.user?.first_name || auth?.user?.username || 'Resident';

    const fetchAnnouncements = useCallback(async (token: string) => {
        try {
            const annRes = await fetch(`${API_URL}/api/announcements/`, { headers: { 'Authorization': `Bearer ${token}` }});
            if (annRes.ok) {
                const annData = await annRes.json();
                setAnnouncements(annData);
                
                if (!canViewAdminMenu) {
                    setUnreadAnnouncements(annData.filter((a: any) => !a.is_read).length);
                }
            }
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    }, [canViewAdminMenu]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('access');
            if (!token) return;

            await fetchAnnouncements(token);

            if (canViewAdminMenu) {
                try {
                    const response = await fetch(`${API_URL}/api/dashboard-stats/`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if (response.ok) setStats(await response.json());
                } catch (error) {
                    console.error("Error fetching stats:", error);
                }
            } else {
                try {
                    const [certRes, permitRes, resRes] = await Promise.all([
                        fetch(`${API_URL}/api/certificates/`, { headers: { 'Authorization': `Bearer ${token}` }}),
                        fetch(`${API_URL}/api/permits/`, { headers: { 'Authorization': `Bearer ${token}` }}),
                        fetch(`${API_URL}/api/reservations/`, { headers: { 'Authorization': `Bearer ${token}` }})
                    ]);
                    
                    if (certRes.ok) setResidentCerts(await certRes.json());
                    if (permitRes.ok) setResidentPermits(await permitRes.json());
                    if (resRes.ok) setResidentReservations(await resRes.json());
                } catch (error) {
                    console.error("Error fetching resident data:", error);
                }
            }
        };

        if (auth?.user) fetchDashboardData();
    }, [auth?.user, canViewAdminMenu, fetchAnnouncements]);

    const markAsRead = async (id: number) => {
        const token = localStorage.getItem('access');
        if (!token) return;
        
        try {
            await fetch(`${API_URL}/api/announcements/${id}/mark_as_read/`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAnnouncements(token);
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const activeRequests = [
        ...residentCerts.map(c => ({ ...c, type: 'Certificate', display: c.certificate_type })),
        ...residentPermits.map(p => ({ ...p, type: 'Permit', display: p.permit_type })),
        ...residentReservations.map(r => ({ ...r, type: 'Reservation', display: r.purpose }))
    ].filter(req => req.status === 'PENDING' || req.status === 'APPROVED' || req.status === 'PROCESSING')
     .sort((a, b) => new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime());

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <div className="shrink-0 w-full"><PageHeader /></div>
            <div className="flex flex-1 overflow-hidden">
                <div className="shrink-0 h-full"><Sidebar /></div>
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="w-full">
                        <div className="flex flex-col mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {displayName}</h1>
                            <p className="text-gray-500 text-sm">
                                {canViewAdminMenu ? "Barangay Overview — San Gabriel, Cavite" : "Resident Portal — Brgy. San Gabriel"}
                            </p>
                        </div>
                        
                        {canViewAdminMenu ? (
                            <>
                                {/* STAFF OVERVIEW CARDS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
                                    <StatCard title="Total Residents" value={(stats.total_residents || 0).toLocaleString()} icon={<UsersIcon />} bgClass="bg-[#eef5fd]" textClass="text-[#3b82f6]" />
                                    <StatCard title="Certs This Month" value={(stats.certs_this_month || 0).toLocaleString()} icon={<FileBadgeIcon />} bgClass="bg-[#f0fdf4]" textClass="text-[#22c55e]" />
                                    <StatCard title="Welfare Beneficiaries" value={(stats.welfare_beneficiaries || 0).toLocaleString()} icon={<HeartHandIcon />} bgClass="bg-[#fef2f2]" textClass="text-[#ef4444]" />
                                    <StatCard title="SK Programs" value={(stats.sk_programs || 0).toLocaleString()} icon={<StarIcon />} bgClass="bg-[#faf5ff]" textClass="text-[#a855f7]" />
                                    <StatCard title="Chatbot Queries" value={(stats.chatbot_queries || 0).toLocaleString()} icon={<ChatIcon />} bgClass="bg-[#f8fafc]" textClass="text-[#64748b]" />
                                </div>

                                {/* STAFF ACTION REQUIRED CENTER */}
                                {(stats.pending_documents > 0 || stats.pending_reservations > 0) && (
                                    <div className="bg-white rounded-lg shadow-sm border border-red-200 mb-8 overflow-hidden">
                                        <div className="bg-red-50 px-6 py-3 border-b border-red-100 flex items-center gap-2">
                                            <div className="text-red-600"><AlertCircleIcon /></div>
                                            <h2 className="text-red-800 font-bold">Action Required</h2>
                                        </div>
                                        {/* CHANGED: Swapped grid layout for flex-col so items span the full width */}
                                        <div className="p-6 flex flex-col gap-4">
                                            {stats.pending_documents > 0 && (
                                                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100 w-full">
                                                    <div>
                                                        <p className="font-bold text-orange-900">{stats.pending_documents} Pending Documents</p>
                                                        <p className="text-sm text-orange-700 mt-1">Certificates waiting for approval.</p>
                                                    </div>
                                                    <button onClick={() => navigate('/certrequests')} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                                                        Review
                                                    </button>
                                                </div>
                                            )}
                                            {stats.pending_reservations > 0 && (
                                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100 w-full">
                                                    <div>
                                                        <p className="font-bold text-blue-900">{stats.pending_reservations} Pending Reservations</p>
                                                        <p className="text-sm text-blue-700 mt-1">Facilities or equipment waiting for approval.</p>
                                                    </div>
                                                    <button onClick={() => navigate('/staff/schedule')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition-colors">
                                                        Review
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                {/* RESIDENT QUICK ACTIONS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <button onClick={() => navigate('/requestcertificate')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><FileTextIcon /></div>
                                        <span className="font-bold text-gray-900">Request Document</span>
                                        <span className="text-xs text-gray-500 mt-1">Clearance, Indigency, Permits</span>
                                    </button>
                                    <button onClick={() => navigate('/reservations/request')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><CalendarIcon /></div>
                                        <span className="font-bold text-gray-900">Book Facility/Equipment</span>
                                        <span className="text-xs text-gray-500 mt-1">Covered Court, Chairs, Tents</span>
                                    </button>
                                    <button onClick={() => navigate('/aiassistant')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><ChatIcon /></div>
                                        <span className="font-bold text-gray-900">Ask Barangay AI</span>
                                        <span className="text-xs text-gray-500 mt-1">Get instant answers 24/7</span>
                                    </button>
                                </div>

                                {/* RESIDENT STATUS TRACKER */}
                                {activeRequests.length > 0 && (
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
                                        <h2 className="text-lg font-bold text-gray-900 mb-4">Active Requests</h2>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                            {activeRequests.map((req, i) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{req.type}: {req.display}</p>
                                                        <p className="text-xs text-gray-500">Requested: {new Date(req.created_at || req.start_time).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                        req.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                        req.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* LATEST ANNOUNCEMENTS (Visible to both) */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <MegaphoneIcon />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Latest Announcements</h2>
                            </div>
                            
                            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                {announcements.length === 0 ? (
                                    <p className="text-gray-500 text-sm">No new announcements from the barangay.</p>
                                ) : (
                                    announcements.map((ann) => (
                                        <div key={ann.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                                    {ann.title}
                                                    {!canViewAdminMenu && !ann.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500" title="Unread"></span>
                                                    )}
                                                </h3>
                                                <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-4">
                                                    {new Date(ann.created_at || ann.date_posted || Date.now()).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-2">
                                                {ann.content || ann.description}
                                            </p>
                                            
                                            {!canViewAdminMenu && !ann.is_read && (
                                                <button 
                                                    onClick={() => markAsRead(ann.id)} 
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold border border-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}