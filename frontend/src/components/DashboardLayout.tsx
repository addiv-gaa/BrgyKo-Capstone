import PageHeader from "./header";
import Sidebar from "./sidebar";
import { useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="h-screen w-full flex bg-gray-100 overflow-hidden text-gray-800">
            {/* Sidebar on the left, full height */}
            <div className="shrink-0 h-full">
                <Sidebar isOpen={isSidebarOpen} />
            </div>

            {/* Header and Main Content stacked on the right */}
            <div className="flex flex-1 flex-col overflow-hidden">
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
