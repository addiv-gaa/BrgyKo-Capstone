import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

// 1. Define menu configurations outside the component to keep the logic clean
const MENU_CONFIG = {
    services: [
        { label: "Dashboard", path: "/" },
        { label: "Request Certificate", path: "/requestcertificate" },
        { label: "Ai Assistant", path: "/aiassistant" },
    ],
    community: [
        { label: "Announcements", path: "/announcements" },
        { label: "Barangay Calendar", path: "/resident/schedule" },
        { label: "Emergency Contacts", path: "/emergencycontacts" },
        { label: "Barangay Officials", path: "/barangayofficials" },
    ],
    administration: [
        { label: "Barangay Calendar", path: "/barangaycalendarstaff" },
        { label: "Residents", path: "/residents" },
        { label: "Inventory", path: "/inventory" },
        { label: "Welfare", path: "/welfare" },
        { label: "SMS Blast", path: "/smsblast" },
        { label: "Reports", path: "/reports" },
        { label: "Geo Mapping", path: "/geomapping" },
        { label: "Documents", path: "/documents" },
        { label: "Cert Requests", path: "/certrequests" },
        { label: "Profile Approvals", path: "/profileupdate" },
    ]
};

const Sidebar = () => {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    // Added optional chaining (?.) to roles to prevent crashes if the array is undefined during load
    const canViewAdminMenu = ['admin', 'staff'].some(role => 
        auth?.user?.roles?.includes(role)
    );

    // 2. Create a helper function to render out the buttons
    const renderMenuSection = (items: { label: string, path: string }[]) => {
        return items.map((item) => (
            <div 
                key={item.path} 
                className="sidebar-button" 
                onClick={() => navigate(item.path)}
            >
                {item.label}
            </div>
        ));
    };

    return (
        <div className="h-screen w-64 m-0 text-left flex flex-col bg-gray-300 text-black shadow-lg shrink-0 overflow-y-auto scrollbar-none">
            
            <div>
                <div className="sidebar-category">SERVICES</div>
                {renderMenuSection(MENU_CONFIG.services)}
            </div>

            <div>
                <div className="sidebar-category">COMMUNITY</div>
                {renderMenuSection(MENU_CONFIG.community)}
            </div>

            {canViewAdminMenu && (
                <div>
                    <div className="sidebar-category">ADMINISTRATION</div>
                    {renderMenuSection(MENU_CONFIG.administration)}
                </div>
            )}
            
        </div>
    );
};

export default Sidebar;