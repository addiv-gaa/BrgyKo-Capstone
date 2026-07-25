import { useState, useEffect, useContext } from "react";
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import { AuthContext } from "../components/AuthContext";

const API_URL = import.meta.env.VITE_API_URL;

interface AuditLog {
    id: number;
    model: string;
    action: string;
    user: string;
    date: string;
    details: string;
}

interface StaffMember {
    id: number;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    date_joined: string;
}

interface SystemSettings {
    barangay_name: string;
    captain_name: string;
    barangay_hall_address: string;
    official_contact_email: string;
    official_contact_number: string;
    barangay_seal_url: string;
    emergency_hotline: string;
    police_hotline: string;
    fire_hotline: string;
    ai_chatbot_enabled: boolean;
    accept_permit_requests: boolean;
    accept_reservations: boolean;
    maintenance_mode: boolean;
    max_pending_requests_per_user: number;
    reservation_lead_time_days: number;
}

export default function AdminHub() {
    const auth = useContext(AuthContext);
    const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'staff' | 'logs' | 'settings'>('staff');

    // Data State
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Form States
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [staffForm, setStaffForm] = useState({ username: "", email: "", password: "", role: "TANOD" });
    const [settingsForm, setSettingsForm] = useState<SystemSettings>({
        barangay_name: "", 
        captain_name: "", 
        barangay_hall_address: "",
        official_contact_email: "",
        official_contact_number: "",
        barangay_seal_url: "",
        emergency_hotline: "", 
        police_hotline: "", 
        fire_hotline: "", 
        ai_chatbot_enabled: true,
        accept_permit_requests: true,
        accept_reservations: true,
        maintenance_mode: false,
        max_pending_requests_per_user: 3,
        reservation_lead_time_days: 2
    });

    const STAFF_ROLES = [
        { value: 'TREASURER', label: 'Treasurer' },
        { value: 'COUNCIL', label: 'Barangay Council' },
        { value: 'SK', label: 'SK' },
        { value: 'TANOD', label: 'Tanod' },
    ];

    useEffect(() => {
        let extractedRole = "";
        try {
            const token = localStorage.getItem('access');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                extractedRole = payload.role || payload.roles || "";
            }
        } catch (e) {
            console.error("Token decoding failed", e);
        }

        const userRole = (Array.isArray(extractedRole) ? extractedRole[0] : extractedRole).toUpperCase();
        
        if (userRole === 'CAPTAIN' || userRole === 'SECRETARY') {
            setIsAuthorized(true);
            fetchData();
        } else {
            setIsAuthorized(false);
            setIsLoading(false);
        }
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('access');
        try {
            const [logsRes, staffRes, settingsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/audit-logs/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/staff-management/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/system/settings/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (logsRes.ok) setLogs(await logsRes.json());
            if (staffRes.ok) setStaffList(await staffRes.json());
            if (settingsRes.ok) setSettingsForm(await settingsRes.json());
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/admin/staff-management/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(staffForm)
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                setStaffForm({ username: "", email: "", password: "", role: "TANOD" });
                fetchData(); 
            } else { alert(`Error: ${data.error || JSON.stringify(data)}`); }
        } catch (error) { alert("Failed to create staff account."); } 
        finally { setIsSubmitting(false); }
    };

    const handleToggleStatus = async (userId: number) => {
        if (!window.confirm("Change this account's access status?")) return;
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/admin/staff-management/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ user_id: userId, action_type: 'toggle_status' })
            });
            if (res.ok) fetchData();
            else alert((await res.json()).error);
        } catch (error) { console.error(error); }
    };

    const handleResetPassword = async (userId: number) => {
        const newPassword = window.prompt("Enter the new temporary password:");
        if (!newPassword) return;
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/admin/staff-management/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ user_id: userId, action_type: 'reset_password', new_password: newPassword })
            });
            const data = await res.json();
            alert(data.message || data.error);
        } catch (error) { console.error(error); }
    };

    const handleChangeRole = async (userId: number, newRole: string) => {
        if (!window.confirm(`Change this user's role to ${newRole}?`)) return;
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/admin/staff-management/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ user_id: userId, action_type: 'change_role', new_role: newRole })
            });
            const data = await res.json();
            if (res.ok) fetchData();
            else alert(data.error);
        } catch (error) { console.error(error); }
    };

    const handleSettingsSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('access');
        try {
            const res = await fetch(`${API_URL}/api/system/settings/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(settingsForm)
            });
            const data = await res.json();
            if (res.ok) { alert(data.message); fetchData(); } 
            else { alert(`Error: ${data.error || JSON.stringify(data)}`); }
        } catch (error) { alert("Failed to update settings."); } 
        finally { setIsSubmitting(false); }
    };

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm";
    const cardClass = "bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-gray-100 overflow-hidden";

    if (!isAuthorized && !isLoading) {
        return (
            <div className="h-screen w-full flex flex-col bg-gray-50">
                <PageHeader />
                <div className="flex flex-1">
                    <Sidebar />
                    <main className="flex-1 flex items-center justify-center p-8 bg-[#f8fafc]">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
                            <p className="text-gray-500 text-sm">You do not have administrative clearance to view this hub.</p>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full flex flex-col bg-gray-50 overflow-hidden text-gray-800 font-sans">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                
                <main className="flex-1 w-full overflow-y-auto p-8 bg-[#f8fafc]">
                    <div className="w-full space-y-8">
                        
                        {/* Header & Tabs */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Command Center</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage personnel, monitor system activity, and configure global settings.</p>
                            </div>
                            
                            {/* Modern Segmented Control Tabs */}
                            <div className="inline-flex bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/50 w-fit">
                                <button 
                                    onClick={() => setActiveTab('staff')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'staff' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Personnel
                                </button>
                                <button 
                                    onClick={() => setActiveTab('logs')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Audit Logs
                                </button>
                                <button 
                                    onClick={() => setActiveTab('settings')}
                                    className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'settings' ? 'bg-white text-blue-700 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Settings
                                </button>
                            </div>
                        </div>

                        {/* STAFF TAB CONTENT */}
                        {activeTab === 'staff' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Registration Form */}
                                <div className={`lg:col-span-1 h-fit ${cardClass}`}>
                                    <div className="px-6 py-5 border-b border-gray-50">
                                        <h3 className="text-base font-bold text-gray-900">Register Staff</h3>
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleStaffSubmit} className="space-y-5">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role Assignment</label>
                                                <select value={staffForm.role} onChange={(e) => setStaffForm({...staffForm, role: e.target.value})} className={inputClass}>
                                                    {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username</label>
                                                <input type="text" required value={staffForm.username} onChange={(e) => setStaffForm({...staffForm, username: e.target.value})} className={inputClass} placeholder="jdelacruz_tanod" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Email</label>
                                                <input type="email" required value={staffForm.email} onChange={(e) => setStaffForm({...staffForm, email: e.target.value})} className={inputClass} placeholder="official@email.com" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Temporary Password</label>
                                                <input type="password" required value={staffForm.password} onChange={(e) => setStaffForm({...staffForm, password: e.target.value})} className={inputClass} placeholder="••••••••" />
                                            </div>
                                            <button type="submit" disabled={isSubmitting} className="w-full mt-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">
                                                {isSubmitting ? "Processing..." : "Create Account"}
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                {/* Staff Directory Table */}
                                <div className={`lg:col-span-2 flex flex-col h-full max-h-[600px] ${cardClass}`}>
                                    <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                        <h3 className="text-base font-bold text-gray-900">Active Personnel</h3>
                                    </div>
                                    <div className="overflow-y-auto flex-1">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50/80 sticky top-0 z-10 backdrop-blur-sm">
                                                <tr>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">User Details</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Role</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Status</th>
                                                    <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {staffList.map((staff) => (
                                                    <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-semibold text-gray-900">{staff.username}</div>
                                                            <div className="text-xs text-gray-500 mt-0.5">{staff.email}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {staff.role === 'CAPTAIN' || staff.role === 'SECRETARY' ? (
                                                                <span className="font-bold text-blue-700 text-xs tracking-wide">{staff.role}</span>
                                                            ) : (
                                                                <select 
                                                                    value={staff.role}
                                                                    onChange={(e) => handleChangeRole(staff.id, e.target.value)}
                                                                    className="bg-transparent border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold rounded-md focus:ring-0 focus:border-blue-500 block w-full py-1.5 px-2 cursor-pointer transition-colors"
                                                                >
                                                                    {STAFF_ROLES.map(r => (
                                                                        <option key={r.value} value={r.value}>{r.label}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${staff.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                                {staff.is_active ? 'Active' : 'Revoked'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right space-x-2">
                                                            <button onClick={() => handleResetPassword(staff.id)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-colors shadow-sm">
                                                                Reset Pw
                                                            </button>
                                                            {!(staff.role === 'CAPTAIN' || staff.role === 'SECRETARY') && (
                                                                <button onClick={() => handleToggleStatus(staff.id)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors shadow-sm ${staff.is_active ? 'text-red-700 bg-white border border-red-200 hover:bg-red-50' : 'text-green-700 bg-white border border-green-200 hover:bg-green-50'}`}>
                                                                    {staff.is_active ? 'Revoke' : 'Restore'}
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LOGS TAB CONTENT */}
                        {activeTab === 'logs' && (
                            <div className={`flex flex-col h-full max-h-[700px] ${cardClass}`}>
                                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                    <h3 className="text-base font-bold text-gray-900">System Activity Logs</h3>
                                    <button onClick={fetchData} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1.5 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Sync Latest
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50/80 sticky top-0 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100 whitespace-nowrap">Timestamp</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">User</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Action</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Target Object</th>
                                                <th className="px-6 py-3 font-semibold text-gray-500 text-[11px] uppercase tracking-widest border-b border-gray-100">Delta Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {logs.map((log, i) => (
                                                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{new Date(log.date).toLocaleString(undefined, {dateStyle: 'medium', timeStyle: 'short'})}</td>
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{log.user}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${log.action === 'Created' ? 'text-green-700 bg-green-50 border-green-200/60' : log.action === 'Updated' ? 'text-blue-700 bg-blue-50 border-blue-200/60' : 'text-red-700 bg-red-50 border-red-200/60'}`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-700 font-medium whitespace-nowrap">{log.model} <span className="text-gray-400 text-xs font-normal">({log.id})</span></td>
                                                    <td className="px-6 py-4 text-xs font-mono text-gray-500 max-w-sm truncate hover:whitespace-normal hover:break-words cursor-help" title={log.details}>
                                                        {log.details}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SETTINGS TAB CONTENT */}
                        {activeTab === 'settings' && (
                            <div className={`w-full ${cardClass}`}>
                                <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">Global Configuration</h3>
                                        <p className="text-sm text-gray-500 mt-1">Updates to these values reflect instantly across the resident dashboard and official documents.</p>
                                    </div>
                                </div>
                                <div className="p-8">
                                    <form onSubmit={handleSettingsSubmit} className="space-y-8">
                                        
                                        {/* Identity & Metadata Group */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                Barangay Identity & Metadata
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Name</label>
                                                    <input type="text" required value={settingsForm.barangay_name} onChange={(e) => setSettingsForm({...settingsForm, barangay_name: e.target.value})} className={inputClass} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Punong Barangay</label>
                                                    <input type="text" required value={settingsForm.captain_name} onChange={(e) => setSettingsForm({...settingsForm, captain_name: e.target.value})} className={inputClass} placeholder="e.g. Juan Dela Cruz" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Hall Address</label>
                                                    <input type="text" required value={settingsForm.barangay_hall_address} onChange={(e) => setSettingsForm({...settingsForm, barangay_hall_address: e.target.value})} className={inputClass} placeholder="Main St." />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Email</label>
                                                    <input type="email" required value={settingsForm.official_contact_email} onChange={(e) => setSettingsForm({...settingsForm, official_contact_email: e.target.value})} className={inputClass} placeholder="official@email.com" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Official Phone Number</label>
                                                    <input type="text" required value={settingsForm.official_contact_number} onChange={(e) => setSettingsForm({...settingsForm, official_contact_number: e.target.value})} className={inputClass} placeholder="09123456789" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Barangay Seal URL</label>
                                                    <input type="text" value={settingsForm.barangay_seal_url} onChange={(e) => setSettingsForm({...settingsForm, barangay_seal_url: e.target.value})} className={inputClass} placeholder="https://..." />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hotlines Group */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                Emergency Dispatch Numbers
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Medical / Rescue</label>
                                                    <input type="text" required value={settingsForm.emergency_hotline} onChange={(e) => setSettingsForm({...settingsForm, emergency_hotline: e.target.value})} className={inputClass} placeholder="911" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Police Desk</label>
                                                    <input type="text" required value={settingsForm.police_hotline} onChange={(e) => setSettingsForm({...settingsForm, police_hotline: e.target.value})} className={inputClass} placeholder="117" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Fire Department</label>
                                                    <input type="text" required value={settingsForm.fire_hotline} onChange={(e) => setSettingsForm({...settingsForm, fire_hotline: e.target.value})} className={inputClass} placeholder="112" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Feature Toggles / Kill-Switches */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                System Capabilities & Kill-Switches
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* AI Chatbot Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-gray-900">Enable AI Chatbot</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Allow residents to ask questions via Gemini AI.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.ai_chatbot_enabled} onChange={(e) => setSettingsForm({...settingsForm, ai_chatbot_enabled: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.ai_chatbot_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.ai_chatbot_enabled ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>

                                                {/* Accept Permit Requests Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-gray-900">Accept Permit Requests</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Global kill-switch for online document requests.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.accept_permit_requests} onChange={(e) => setSettingsForm({...settingsForm, accept_permit_requests: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.accept_permit_requests ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.accept_permit_requests ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>

                                                {/* Accept Reservations Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-gray-900">Accept Facility Reservations</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Enable or disable court/equipment borrowing.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.accept_reservations} onChange={(e) => setSettingsForm({...settingsForm, accept_reservations: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.accept_reservations ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.accept_reservations ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>

                                                {/* Maintenance Mode Toggle */}
                                                <label className="flex items-center justify-between cursor-pointer p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors shadow-sm">
                                                    <div className="pr-4">
                                                        <div className="text-sm font-bold text-red-600">Maintenance Mode</div>
                                                        <div className="text-xs text-gray-500 mt-0.5">Locks out standard residents with maintenance banner.</div>
                                                    </div>
                                                    <div className="relative shrink-0">
                                                        <input type="checkbox" className="sr-only" checked={settingsForm.maintenance_mode} onChange={(e) => setSettingsForm({...settingsForm, maintenance_mode: e.target.checked})} />
                                                        <div className={`block w-12 h-7 rounded-full transition-colors ${settingsForm.maintenance_mode ? 'bg-red-600' : 'bg-gray-200'}`}></div>
                                                        <div className={`absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-transform duration-300 shadow-sm ${settingsForm.maintenance_mode ? 'transform translate-x-5' : ''}`}></div>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Workflow & Policy Limits Group */}
                                        <div className="space-y-5 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Workflow & Policy Limits
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Max Pending Requests Per User</label>
                                                    <input type="number" min="1" max="10" required value={settingsForm.max_pending_requests_per_user} onChange={(e) => setSettingsForm({...settingsForm, max_pending_requests_per_user: parseInt(e.target.value) || 1})} className={inputClass} />
                                                    <p className="text-[11px] text-gray-500 mt-1">Prevents spam by limiting active document requests.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Reservation Lead Time (Days)</label>
                                                    <input type="number" min="0" max="30" required value={settingsForm.reservation_lead_time_days} onChange={(e) => setSettingsForm({...settingsForm, reservation_lead_time_days: parseInt(e.target.value) || 0})} className={inputClass} />
                                                    <p className="text-[11px] text-gray-500 mt-1">Minimum advance notice required to book facilities.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2 flex justify-end">
                                            <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md">
                                                {isSubmitting ? "Saving..." : "Save Configuration"}
                                            </button>
                                        </div>

                                    </form>
                                </div>
                            </div>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}