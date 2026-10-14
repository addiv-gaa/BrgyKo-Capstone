import PageHeader from "./header";
import Sidebar from "./sidebar";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const location = useLocation();

    // Auto-close sidebar on mobile/tablet when navigating
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    return (
        <div className="h-screen w-full flex bg-gray-100 overflow-hidden text-gray-800 relative">
            {/* Mobile/Tablet Backdrop Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[900] lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                    role="button"
                    tabIndex={0}
                    aria-label="Close navigation sidebar"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'Enter') {
                            setIsSidebarOpen(false);
                        }
                    }}
                />
            )}

            {/* Sidebar Container */}
            <div className={`shrink-0 h-full absolute lg:relative z-[1000] transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                {/* Pass isSidebarOpen to handle width */}
                <Sidebar isOpen={isSidebarOpen} />
            </div>

            {/* Header and Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden w-full">
                <div className="shrink-0 w-full">
                    <PageHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                </div>
                
                {/* Main Content Area */}
                <div className="flex-1 h-full overflow-y-auto bg-transparent">
                    {children}
                </div>
            </div>
        </div>
    );
}
