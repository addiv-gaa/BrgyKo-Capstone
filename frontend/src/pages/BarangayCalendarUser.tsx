import { useState, useEffect } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import BarangayCalendar from "../components/BarangayCalendar";


export default function ResidentSchedulePage() {
    
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="w-full h-full">
                        
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Barangay Schedule</h1>
                                <p className="text-gray-500 text-sm mt-1">View official events, official absences, and facility availability.</p>
                            </div>
                            
                            
                        </div>

                        <div className="mb-8">
                            <BarangayCalendar />
                        </div>
                        
                        

                    </div>
                </main>
            </div>
        </div>
    );
}