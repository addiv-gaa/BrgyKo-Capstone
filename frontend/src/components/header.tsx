import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { AuthContext } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import { MENU_CONFIG } from "./sidebar";

const PageHeader = ({ toggleSidebar }: { toggleSidebar?: () => void }) => {
    const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useContext(AuthContext);
    const { settings } = useSettings();
    const [userRole, setUserRole] = useState<string>("Resident");

    useEffect(() => {
        let extractedRole = "";
        if (auth?.user) {
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
    const displayRole = userRole.toLowerCase() === 'resident' ? 'Resident' : 'Barangay Staff';

    const ProfileClicked = () => navigate('/profile');

    // Find the current page title based on the path
    let currentTitle = "Dashboard";
    const currentPath = location.pathname;
    
    // Flatten all menu items to easily find the matching one
    const allMenuItems = [
        ...MENU_CONFIG.residentServices,
        ...MENU_CONFIG.staffAdministration
    ];
    
    const matchedItem = allMenuItems.find(item => item.path === currentPath);
    if (matchedItem) {
        currentTitle = matchedItem.label;
    } else if (currentPath.includes('/profile')) {
        currentTitle = "My Profile";
    }

    const isLoggedIn = !!auth?.user;

    return (
        <header className="h-16 w-full bg-white flex items-center justify-between px-6 sticky top-0 shrink-0 z-50 border-b border-gray-200 shadow-sm">
            
            {/* Left Side: Hamburger & Title */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={toggleSidebar} 
                    aria-label="Toggle navigation menu"
                    className="p-1 hover:bg-gray-100 rounded text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <div className="flex flex-col min-w-0">
                    <h1 className="text-sm font-bold text-gray-900 leading-tight">{currentTitle}</h1>
                    <p className="text-[11px] text-gray-500 leading-tight truncate">
                        {settings?.barangay_name || 'Barangay'} — {settings?.barangay_city || 'City of General Trias'}, {settings?.barangay_province || 'Cavite'}
                    </p>
                </div>
            </div>
            
            {/* Right Side: Auth Button */}
            <div className="flex items-center">
                {isLoggedIn ? (
                    <button 
                        onClick={() => setIsConfirmingLogout(true)}
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
            {isConfirmingLogout && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-sans">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-red-100">
                        <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Log Out?</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to log out of your session?
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsConfirmingLogout(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                                    Cancel
                                </button>
                                <button onClick={() => { setIsConfirmingLogout(false); navigate('/logout'); }} className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                                    Yes, Log Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default PageHeader;
