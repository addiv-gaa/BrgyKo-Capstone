import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { MENU_CONFIG } from "./sidebar";

const PageHeader = ({ toggleSidebar }: { toggleSidebar?: () => void }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useContext(AuthContext);
    const [userRole, setUserRole] = useState<string>("Resident");

    useEffect(() => {
        let extractedRole = "";
        try {
            const token = localStorage.getItem('access');
            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                extractedRole = payload.role || payload.roles || "";
            }
        } catch (error) {}

        if (!extractedRole && auth?.user) {
            const contextUser = auth.user as any;
            extractedRole = contextUser.role || contextUser.roles || "";
        }

        if (Array.isArray(extractedRole)) {
            setUserRole(extractedRole[0] || "Resident");
        } else if (typeof extractedRole === 'string') {
            setUserRole(extractedRole || "Resident");
        }
    }, [auth]);

    // Format role for display (e.g., "Resident", "Barangay Staff")
    const displayRole = userRole.toLowerCase() === 'resident' ? 'Resident' : 
                        userRole.toLowerCase() === 'tanod' ? 'Tanod' : 'Barangay Staff';

    const ProfileClicked = () => navigate('/profile');

    // Find the current page title based on the path
    let currentTitle = "Dashboard";
    const currentPath = location.pathname;
    
    // Flatten all menu items to easily find the matching one
    const allMenuItems = [
        ...MENU_CONFIG.residentServices,
        ...MENU_CONFIG.tanodAdministration,
        ...MENU_CONFIG.staffAdministration
    ];
    
    const matchedItem = allMenuItems.find(item => item.path === currentPath);
    if (matchedItem) {
        currentTitle = matchedItem.label;
    } else if (currentPath.includes('/profile')) {
        currentTitle = "My Profile";
    }

    const isLoggedIn = !!auth?.user || !!localStorage.getItem('access');

    return (
        <header className="h-16 w-full bg-white flex items-center justify-between px-6 sticky top-0 shrink-0 z-50 border-b border-gray-200 shadow-sm">
            
            {/* Left Side: Hamburger & Title */}
            <div className="flex items-center gap-4">
                <button onClick={toggleSidebar} className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold text-gray-900 leading-tight">{currentTitle}</h1>
                    <p className="text-[11px] text-gray-500 leading-tight">Brgy. San Gabriel A — Gen. Trias, Cavite</p>
                </div>
            </div>
            
            {/* Right Side: Auth Button */}
            <div className="flex items-center">
                {isLoggedIn ? (
                    <button 
                        onClick={() => navigate('/logout')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                ) : (
                    <button 
                        onClick={() => navigate('/login')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-semibold hover:bg-green-100 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                        </svg>
                        Login
                    </button>
                )}
            </div>
        </header>
    );
};

export default PageHeader;