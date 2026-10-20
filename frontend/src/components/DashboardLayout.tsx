import PageHeader from "./header";
import Sidebar from "./sidebar";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSettings } from "./SettingsContext";
import { AlertTriangle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const location = useLocation();
    const { settings } = useSettings();

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
                {/* Emergency Public Advisory Banner */}
                {settings?.show_advisory_banner && settings.advisory_banner_text && (
                    <div className="bg-amber-600 text-white text-xs sm:text-sm font-semibold shadow-md z-40 border-b border-amber-700 shrink-0 flex items-center h-9 sm:h-10 overflow-hidden relative select-none">
                        {/* Fixed Badge on the Left */}
                        <div className="bg-amber-800 text-amber-100 uppercase text-[10px] sm:text-xs font-black px-3 py-1 sm:py-1.5 tracking-wider shrink-0 flex items-center gap-1.5 shadow-md z-20 border-r border-amber-500/40 h-full">
                            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 animate-pulse" />
                            <span>Public Advisory</span>
                        </div>

                        {/* Scrolling Content Track */}
                        <div className="relative flex-1 overflow-hidden h-full flex items-center">
                            {/* Left Gradient Fade */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-amber-600 to-transparent z-10 pointer-events-none" />
                            
                            {/* Marquee Text */}
                            <div className="w-full flex">
                                <div 
                                    className="animate-marquee pause-on-hover pl-4 text-amber-50 tracking-wide cursor-default font-medium text-xs sm:text-sm whitespace-nowrap"
                                    title="Public Advisory (hover to pause)"
                                >
                                    {settings.advisory_banner_text}
                                </div>
                            </div>

                            {/* Right Gradient Fade */}
                            <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-amber-600 to-transparent z-10 pointer-events-none" />
                        </div>
                    </div>
                )}

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
