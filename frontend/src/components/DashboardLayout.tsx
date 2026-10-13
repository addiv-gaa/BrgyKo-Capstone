import PageHeader from "./header";
import Sidebar from "./sidebar";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const location = useLocation();

    // Auto-close sidebar on mobile when navigating
    useEffect(() => {
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    return (
        <div className="h-screen w-full flex bg-gray-100 overflow-hidden text-gray-800 relative">
            {/* Mobile Backdrop Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[900] md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`shrink-0 h-full absolute md:relative z-[1000] transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                {/* We pass a forced true or false to Sidebar to handle its internal width if needed, or just let the container handle translation. Sidebar's internal w-0 logic can conflict with translate-x, so let's just pass isSidebarOpen but for desktop we want it to close if clicked. */}
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
