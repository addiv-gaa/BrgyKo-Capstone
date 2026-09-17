import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

const MENU_CONFIG = {
    // Menus available to normal residents
    residentServices: [
        { label: "Dashboard", path: "/" },
        { label: "AI Assistant", path: "/aiassistant" },
    ],
    residentCommunity: [
        { label: "Announcements", path: "/announcements" },
        { label: "Barangay Calendar", path: "/resident/schedule" },
        { label: "Emergency Contacts", path: "/emergencycontacts" },
        { label: "Barangay Officials", path: "/barangayofficials" },
    ],
    
    // Menus specific to Tanods / Field Staff
    tanodAdministration: [
        { label: "Geo Mapping", path: "/geomapping" },
        { label: "Staff Calendar", path: "/barangaycalendarstaff" },
    ],

    // Comprehensive menus for Captains, Secretaries, and Admins
    staffAdministration: [
        { label: "Admin Hub", path: "/adminhub" },
        { label: "Residents Directory", path: "/residents" },
        { label: "Staff Calendar", path: "/barangaycalendarstaff" },
        { label: "Reports", path: "/reports" },
        { label: "Geo Mapping", path: "/geomapping" },
        { label: "Documents & Records", path: "/documents" },
    ]
};

const Sidebar = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [userRole, setUserRole] = useState<string>("");

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

    const renderMenuSection = (items: { label: string, path: string }[]) => {
        return items.map((item) => (
            <div 
                key={item.path} 
                className="sidebar-button cursor-pointer px-4 py-2 hover:bg-gray-400 transition-colors text-sm" 
                onClick={() => navigate(item.path)}
            >
                {item.label}
            </div>
        ));
    };

    return (
        <div className="h-screen w-64 m-0 text-left flex flex-col bg-gray-300 text-black shadow-lg shrink-0 overflow-y-auto scrollbar-none">
            
            {/* SERVICES SECTION */}
            <div className="py-4">
                <div className="sidebar-category px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">SERVICES</div>
                {renderMenuSection(MENU_CONFIG.residentServices)}
            </div>

            {/* COMMUNITY SECTION */}
            <div className="pb-4 border-t border-gray-400 pt-4">
                <div className="sidebar-category px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">COMMUNITY</div>
                {renderMenuSection(MENU_CONFIG.residentCommunity)}
            </div>

            {/* TANOD-SPECIFIC ADMINISTRATION */}
            {isTanod && (
                <div className="pb-4 border-t border-gray-400 pt-4">
                    <div className="sidebar-category px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">FIELD OPERATIONS</div>
                    {renderMenuSection(MENU_CONFIG.tanodAdministration)}
                </div>
            )}

            {/* CAPTAIN & SECRETARY ADMINISTRATION */}
            {isCaptainOrSecretary && (
                <div className="pb-4 border-t border-gray-400 pt-4">
                    <div className="sidebar-category px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ADMINISTRATION</div>
                    {renderMenuSection(MENU_CONFIG.staffAdministration)}
                </div>
            )}
            
        </div>
    );
};

export default Sidebar;