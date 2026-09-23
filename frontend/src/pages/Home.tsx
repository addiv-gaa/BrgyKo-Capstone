import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../components/AuthContext";
import StatCard from "../components/statcard";
import DashboardAdminView from "../components/DashboardAdminView";

const API_URL = import.meta.env.VITE_API_URL;

// --- Icons ---
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FileBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M7 16.5 8 22l-3-1-3 1 1-5.5"/></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const HeartHandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const MegaphoneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>;
const PhoneCallIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const AlertCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const MapIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
const ShieldAlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const ClockIcon = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
export default function Home() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [userRole, setUserRole] = useState<string>("");
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null); // Modal state for clicking an announcement
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        let extractedRole = "";
        try {
            const token = localStorage.getItem('access');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                extractedRole = payload.role || payload.roles || "";
            }
        } catch (error) {
            console.error("Token decoding failed", error);
        }

        if (!extractedRole && auth?.user) {
            const contextUser = auth.user as any;
            extractedRole = contextUser.role || contextUser.roles || "";
        }

        if (Array.isArray(extractedRole)) {
            setUserRole(extractedRole[0]?.toUpperCase() || "");
        } else if (typeof extractedRole === 'string') {
            setUserRole(extractedRole.toUpperCase());
        }
    }, [auth]);

    const isCaptainOrSecretary = ['SECRETARY', 'CAPTAIN', 'ADMIN', 'STAFF'].includes(userRole);
    const isTanod = userRole === 'TANOD';
    const isSK = userRole === 'SK';
    const isResident = userRole === 'RESIDENT' || (!isCaptainOrSecretary && !isTanod && !isSK);

    const displayName = auth?.user?.first_name || auth?.user?.username || 'Resident';

    const [stats, setStats] = useState({ 
        total_residents: 0, 
        chatbot_queries: 0 
    });

    const [welfareBeneficiariesCount, setWelfareBeneficiariesCount] = useState<number>(0);
    
    const [residentCerts, setResidentCerts] = useState<any[]>([]);
    const [residentPermits, setResidentPermits] = useState<any[]>([]);
    const [residentReservations, setResidentReservations] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState<any[]>([]);

    const fetchAnnouncements = useCallback(async (token: string | null) => {
        try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const annRes = await fetch(`${API_URL}/api/announcements/`, { headers });
            if (annRes.ok) {
                const annData = await annRes.json();
                setAnnouncements(annData.results || annData);
            }
        } catch (error) {
            console.error("Error fetching announcements:", error);
        }
    }, []);

    const fetchEmergencyContacts = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/emergency-contacts/`);
            if (res.ok) {
                const data = await res.json();
                setEmergencyContacts(data.results || data);
            }
        } catch (error) {
            console.error("Error fetching emergency contacts:", error);
        }
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            const token = localStorage.getItem('access');
            
            // Fetch public data regardless of login status
            await fetchAnnouncements(token);
            await fetchEmergencyContacts();

            // If not logged in, we skip fetching private user stats
            if (!token) return;

            if (isCaptainOrSecretary) {
                try {
                    const response = await fetch(`${API_URL}/api/dashboard-stats/`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if (response.ok) {
                        const data = await response.json();
                        setStats(data);
                        if (typeof data.welfare_beneficiaries === 'number') {
                            setWelfareBeneficiariesCount(data.welfare_beneficiaries);
                        }
                    }

                    // Fetch actual resident registry to accurately count the welfare statuses if not provided
                    const resResponse = await fetch(`${API_URL}/api/residents/?paginate=false`, { headers: { 'Authorization': `Bearer ${token}` }});
                    if (resResponse.ok) {
                        const resData = await resResponse.json();
                        const residentsList = Array.isArray(resData) ? resData : (resData.results || []); 
                        
                        // Count residents who have ANY of the welfare flags true
                        const welfareCount = residentsList.filter((r: any) => 
                            r.is_4ps_beneficiary || 
                            r.is_senior_citizen || 
                            r.is_pwd || 
                            r.is_solo_parent
                        ).length;
                        
                        setWelfareBeneficiariesCount(welfareCount);
                    }
                } catch (error) {
                    console.error("Error fetching stats:", error);
                }
            } else if (isResident) {
                try {
                    const [certRes, permitRes, resRes] = await Promise.all([
                        fetch(`${API_URL}/api/certificates/`, { headers: { 'Authorization': `Bearer ${token}` }}),
                        fetch(`${API_URL}/api/permits/`, { headers: { 'Authorization': `Bearer ${token}` }}),
                        fetch(`${API_URL}/api/reservations/`, { headers: { 'Authorization': `Bearer ${token}` }})
                    ]);
                    
                    if (certRes.ok) {
                        const data = await certRes.json();
                        setResidentCerts(data.results || data);
                    }
                    if (permitRes.ok) {
                        const data = await permitRes.json();
                        setResidentPermits(data.results || data);
                    }
                    if (resRes.ok) {
                        const data = await resRes.json();
                        setResidentReservations(data.results || data);
                    }
                } catch (error) {
                    console.error("Error fetching resident data:", error);
                }
            }
        };

        fetchDashboardData();
    }, [auth?.user, isCaptainOrSecretary, isResident, fetchAnnouncements, fetchEmergencyContacts]);

    const activeRequests = [
        ...residentCerts.map(c => ({ ...c, type: 'Certificate', display: c.certificate_type })),
        ...residentPermits.map(p => ({ ...p, type: 'Permit', display: p.permit_type })),
        ...residentReservations.map(r => ({ ...r, type: 'Reservation', display: r.purpose }))
    ].filter(req => req.status === 'PENDING' || req.status === 'APPROVED' || req.status === 'PROCESSING')
     .sort((a, b) => new Date(b.created_at || b.start_time).getTime() - new Date(a.created_at || a.start_time).getTime());

    return (
        <div className="h-full w-full flex bg-gray-100 overflow-hidden text-gray-800">
            <div className="flex flex-1 flex-col overflow-hidden">
                <main className="flex-1 h-full overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="w-full">
                        
                        {/* Green Banner */}
                        <div className="bg-[#1e7b2b] text-white rounded-xl mb-6 p-8 flex items-center justify-between relative overflow-hidden shadow-sm">
                            <div className="flex items-center gap-6 z-10">
                                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-1 shadow-md">
                                    <img src="/b4-logo.jpg" alt="Logo" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-xs text-green-100 mb-1">Republic of the Philippines · Gen. Trias, Cavite</p>
                                    <h1 className="text-3xl font-bold mb-1">Barangay San Gabriel</h1>
                                    <p className="text-sm text-green-50 mb-4">Management Information System</p>
                                    <div className="inline-flex items-center gap-2 bg-[#176623] border border-[#2e8f3b] text-xs px-3 py-1.5 rounded-full w-fit">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        <span>System Online — {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Background watermark */}
                            <div className="absolute right-[-40px] top-[-40px] opacity-10 pointer-events-none transform scale-150 z-0">
                                <img src="/b4-logo.jpg" alt="" className="w-96 h-96 rounded-full grayscale opacity-20" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            </div>
                        </div>
                        
                        {/* --- VIEW 1: CAPTAIN & SECRETARY --- */}
                        {isCaptainOrSecretary && <DashboardAdminView />}

                        {/* --- VIEW 2: TANOD / FIELD STAFF --- */}
                        {isTanod && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <button onClick={() => navigate('/tanod/dashboard')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-red-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-red-50 text-red-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><ShieldAlertIcon /></div>
                                    <span className="font-bold text-gray-900">Incident Dashboard</span>
                                    <span className="text-xs text-gray-500 mt-1">View & Update Active Incidents</span>
                                </button>
                                <button onClick={() => navigate('/geomapping')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><MapIcon /></div>
                                    <span className="font-bold text-gray-900">Geo Mapping</span>
                                    <span className="text-xs text-gray-500 mt-1">View Outposts & Heatmaps</span>
                                </button>
                                <button onClick={() => navigate('/barangaycalendarstaff')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><CalendarIcon /></div>
                                    <span className="font-bold text-gray-900">Staff Schedule</span>
                                    <span className="text-xs text-gray-500 mt-1">View Duty Rosters & Events</span>
                                </button>
                            </div>
                        )}

                        {/* --- VIEW 3: SK / YOUTH COUNCIL --- */}
                        {isSK && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <button onClick={() => navigate('/inventory')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-pink-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-pink-50 text-pink-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><HeartHandIcon /></div>
                                    <span className="font-bold text-gray-900">Inventory</span>
                                    <span className="text-xs text-gray-500 mt-1">Manage SK & Welfare Items</span>
                                </button>
                                <button onClick={() => navigate('/barangaycalendarstaff')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><CalendarIcon /></div>
                                    <span className="font-bold text-gray-900">Staff Calendar</span>
                                    <span className="text-xs text-gray-500 mt-1">View Duty Rosters & Events</span>
                                </button>
                                <button onClick={() => navigate('/announcements')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all group">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><MegaphoneIcon /></div>
                                    <span className="font-bold text-gray-900">Announcements</span>
                                    <span className="text-xs text-gray-500 mt-1">Manage & View Updates</span>
                                </button>
                            </div>
                        )}

                        {/* --- VIEW 4: RESIDENT --- */}
                        {isResident && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                    <button onClick={() => navigate('/announcements')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-orange-50 text-orange-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><MegaphoneIcon /></div>
                                        <span className="font-bold text-gray-900">Announcements</span>
                                        <span className="text-xs text-gray-500 mt-1">View latest updates</span>
                                    </button>
                                    <button onClick={() => navigate('/resident/schedule')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-green-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-green-50 text-green-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><CalendarIcon /></div>
                                        <span className="font-bold text-gray-900">Barangay Calendar</span>
                                        <span className="text-xs text-gray-500 mt-1">View events and schedules</span>
                                    </button>
                                    <button onClick={() => navigate('/aiassistant')} className="flex flex-col items-center justify-center p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-purple-300 hover:shadow-md transition-all group">
                                        <div className="p-3 bg-purple-50 text-purple-600 rounded-full mb-3 group-hover:scale-110 transition-transform"><ChatIcon /></div>
                                        <span className="font-bold text-gray-900">Ask Barangay AI</span>
                                        <span className="text-xs text-gray-500 mt-1">Get instant answers 24/7</span>
                                    </button>
                                </div>

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
                                                        'bg-green-100 text-green-700'
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

                        {/* --- DUAL GRID SECTION: LATEST ANNOUNCEMENTS & EMERGENCY CONTACTS --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            
                            {/* Left: Latest Announcements */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                                <div className="flex items-center gap-2 mb-6 text-[#1e7b2b]">
                                    <MegaphoneIcon />
                                    <h2 className="text-lg font-bold text-gray-900">Latest Announcements</h2>
                                </div>
                                
                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 max-h-[420px]">
                                    {announcements.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No new announcements from the barangay.</p>
                                    ) : (
                                        announcements.map((ann) => (
                                            <div 
                                                key={ann.id} 
                                                onClick={() => setSelectedAnnouncement(ann)}
                                                className="border-b border-gray-100 pb-4 last:border-0 last:pb-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                                            >
                                                {/* Categories / Tags */}
                                                {ann.categories && ann.categories.length > 0 && (
                                                    <div className="flex gap-2 mb-2">
                                                        {ann.categories.map((cat: string, idx: number) => (
                                                            <span key={idx} className="bg-[#e6f4ea] text-[#1e8e3e] px-2 py-0.5 rounded text-[10px] font-bold tracking-wider border border-[#a8dfb5]">
                                                                {cat}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                <h3 className="font-semibold text-gray-800 text-base mb-0.5 flex items-center gap-2">
                                                    {ann.title}
                                                    {!isCaptainOrSecretary && !ann.is_read && (
                                                        <span className="w-2 h-2 rounded-full bg-green-500" title="Unread"></span>
                                                    )}
                                                </h3>
                                                
                                                <p className="text-xs text-gray-500 mb-2">
                                                    {(() => {
                                                        const d = new Date(ann.created_at || ann.date_posted || Date.now());
                                                        return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                                                    })()} · {ann.author_name || 'Admin'}
                                                </p>

                                                {ann.linked_event_details && (() => {
                                                    const formatTime = (iso: string) => {
                                                        const d = new Date(iso);
                                                        return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                                    };
                                                    return (
                                                        <div className="flex items-center gap-3 text-[#0f766e] text-xs font-medium mb-3">
                                                            <div className="flex items-center gap-1">
                                                                <ClockIcon className="w-3.5 h-3.5" />
                                                                <span>Start: {formatTime(ann.linked_event_details.start_time)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <ClockIcon className="w-3.5 h-3.5" />
                                                                <span>End: {formatTime(ann.linked_event_details.end_time)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-2">
                                                    {ann.content || ann.description}
                                                </p>

                                                {/* Attached Image / Infographic Thumbnail */}
                                                {(ann.image || ann.attachment) && (
                                                    <div className="mb-2 max-h-32 overflow-hidden rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center">
                                                        <img 
                                                            src={ann.image || ann.attachment} 
                                                            alt={ann.title} 
                                                            className="max-h-32 w-full object-cover rounded" 
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Right: Quick Emergency Contacts */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                                <div className="flex items-center gap-2 mb-6 text-[#1e7b2b]">
                                    <PhoneCallIcon />
                                    <h2 className="text-lg font-bold text-gray-900">Quick Emergency Contacts</h2>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 max-h-[420px]">
                                    {emergencyContacts.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No emergency contacts available.</p>
                                    ) : (
                                        emergencyContacts.map((contact: any) => (
                                            <div key={contact.id} className="py-3.5 border-b border-gray-100 last:border-0 last:pb-0 flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm uppercase">{contact.name}</p>
                                                    <p className="text-xs text-gray-500">{contact.description}</p>
                                                </div>
                                                <span className="font-semibold text-emerald-600 text-sm ml-4 whitespace-nowrap">{contact.phone}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>
                </main>
            </div>

            {/* ANNOUNCEMENT DETAIL MODAL */}
            {selectedAnnouncement && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h3 className="text-xl font-bold text-gray-900">{selectedAnnouncement.title}</h3>
                            <button 
                                onClick={() => setSelectedAnnouncement(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs text-gray-400">
                                Posted on: {new Date(selectedAnnouncement.created_at || selectedAnnouncement.date_posted || Date.now()).toLocaleDateString()}
                            </p>

                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {selectedAnnouncement.content || selectedAnnouncement.description}
                            </p>

                            {(selectedAnnouncement.image || selectedAnnouncement.attachment) && (
                                <div className="mt-4 flex justify-center bg-gray-100 p-2 rounded-md border border-gray-200">
                                    <img 
                                        src={selectedAnnouncement.image || selectedAnnouncement.attachment} 
                                        alt={selectedAnnouncement.title} 
                                        className="max-h-[60vh] object-contain rounded" 
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end border-t pt-4">
                            <button 
                                onClick={() => setSelectedAnnouncement(null)}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}