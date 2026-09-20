import { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "./AuthContext";

export const MENU_CONFIG = {
    residentServices: [
        { label: "Dashboard", path: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
        { label: "Announcements", path: "/announcements", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
        { label: "Barangay Calendar", path: "/resident/schedule", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { label: "Org Chart", path: "/barangayofficials", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
        { label: "Emergency Contacts", path: "/emergencycontacts", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
        { label: "AI Assistant", path: "/aiassistant", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    ],
    // Kept for backward compatibility if needed in other views
    tanodAdministration: [
        { label: "Incident Dashboard", path: "/tanod/dashboard", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
    ],
    staffAdministration: [
        { label: "Admin Hub", path: "/adminhub", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" },
        { label: "Residents Directory", path: "/residents", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
        { label: "Staff Calendar", path: "/barangaycalendarstaff", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
        { label: "Reports", path: "/reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
        { label: "Geo Mapping", path: "/geomapping", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z" },
        { label: "Documents & Records", path: "/documents", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    ]
};

const Sidebar = ({ isOpen = true }: { isOpen?: boolean }) => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const [userRole, setUserRole] = useState<string>("");
    const [username, setUsername] = useState<string>("User");

    useEffect(() => {
        let extractedRole = "";
        let extractedUsername = "";
        try {
            const token = localStorage.getItem('access');
            if (token) {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                extractedRole = payload.role || payload.roles || "";
                extractedUsername = payload.username || payload.name || "";
            }
        } catch (error) {}

        if (!extractedRole && auth?.user) {
            const contextUser = auth.user as any;
            extractedRole = contextUser.role || contextUser.roles || "";
            if (!extractedUsername) extractedUsername = contextUser.username || contextUser.name || "";
        }

        if (Array.isArray(extractedRole)) {
            setUserRole(extractedRole[0] || "Resident");
        } else if (typeof extractedRole === 'string') {
            setUserRole(extractedRole || "Resident");
        }
        
        setUsername(extractedUsername || "User");
    }, [auth]);

    const isCaptainOrSecretary = ['SECRETARY', 'CAPTAIN', 'ADMIN', 'STAFF'].includes(userRole.toUpperCase());
    const isTanod = userRole.toUpperCase() === 'TANOD';
    
    const displayRole = userRole.toLowerCase() === 'resident' ? 'Resident' : 
                        userRole.toLowerCase() === 'tanod' ? 'Tanod' : 'Barangay Staff';

    const renderMenuSection = (items: { label: string, path: string, icon: string }[]) => {
        return items.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
                <div 
                    key={item.path} 
                    className={`cursor-pointer px-4 py-2.5 mx-3 mb-1 rounded-md transition-colors text-sm flex items-center justify-between ${
                        isActive ? 'bg-[#44934e] text-white font-semibold' : 'text-green-100 hover:bg-[#2e8f3b]'
                    }`}
                    onClick={() => navigate(item.path)}
                >
                    <div className="flex items-center gap-3">
                        <svg className="w-4 h-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        {item.label}
                    </div>
                    {isActive && <span className="text-[10px] font-bold">&gt;</span>}
                </div>
            );
        });
    };

    return (
        <div className={`h-screen bg-[#1e7b2b] text-white flex flex-col shrink-0 shadow-[4px_0_15px_rgba(0,0,0,0.1)] transition-all duration-300 relative overflow-hidden ${
            isOpen ? 'w-64' : 'w-0'
        }`}>
            {/* Background watermark */}
            <div className="absolute left-[-60px] top-[40%] opacity-[0.05] pointer-events-none transform scale-150 z-0">
                <img src="/b4-logo.jpg" alt="" className="w-64 h-64 rounded-full grayscale" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-none z-10 w-64 pt-6">
                
                {/* Branding inside sidebar (only if there is no separate header, but the screenshot has both) */}
                <div className="flex items-center gap-3 px-6 mb-8">
                    <img src="/b4-logo.jpg" className="w-10 h-10 rounded-full bg-white p-0.5" alt="Logo" />
                    <div>
                        <h2 className="text-[13px] font-bold leading-tight">Brgy. San Gabriel</h2>
                        <p className="text-[10px] text-green-200">Gen. Trias, Cavite</p>
                    </div>
                </div>

                <div className="space-y-1">
                    {renderMenuSection(MENU_CONFIG.residentServices)}
                    
                    {isTanod && (
                        <>
                            <div className="px-6 mt-4 mb-2 text-[10px] font-bold text-green-300 uppercase tracking-wider">Field Operations</div>
                            {renderMenuSection(MENU_CONFIG.tanodAdministration)}
                        </>
                    )}

                    {isCaptainOrSecretary && (
                        <>
                            <div className="px-6 mt-4 mb-2 text-[10px] font-bold text-green-300 uppercase tracking-wider">Administration</div>
                            {renderMenuSection(MENU_CONFIG.staffAdministration)}
                        </>
                    )}
                </div>
            </div>

            {/* Bottom User Profile Section */}
            <div className="p-4 w-64 z-10 bg-[#1e7b2b]">
                <div className="bg-[#44934e] rounded-lg p-3 flex items-center border border-[#2e8f3b]">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-green-200 uppercase font-bold tracking-wider leading-none">Logged in as</span>
                        <span className="text-sm font-semibold text-white leading-tight mt-0.5">{username}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;