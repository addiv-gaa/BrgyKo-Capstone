import React from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";

// Define the data structure
const contacts = [
    { name: "Barangay Emergency Hotline", category: "Barangay", phone: "0917-SAN-ISIDRO", color: "bg-red-600", textColor: "text-red-700" },
    { name: "Municipal Health Center", category: "Health", phone: "(046) 433-1234", color: "bg-green-700", textColor: "text-green-700" },
    { name: "BFP Fire Station", category: "Fire", phone: "(046) 433-5678", color: "bg-orange-600", textColor: "text-orange-700" },
    { name: "PNP Police Station", category: "Police", phone: "(046) 433-9012", color: "bg-blue-800", textColor: "text-blue-800" },
    { name: "NDRRMC Cavite", category: "Disaster", phone: "0918-NDRRMC1", color: "bg-yellow-500", textColor: "text-yellow-600" },
    { name: "Philippine Red Cross", category: "Relief", phone: "143", color: "bg-red-700", textColor: "text-red-700" },
];

export default function EmergencyContacts() {
    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    {/* Header Section */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Emergency Contacts</h1>
                        <p className="text-gray-500 text-sm">Quick access to emergency services in Cavite</p>
                    </div>

                    {/* Grid Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {contacts.map((contact, index) => (
                            <div
                                key={index}
                                className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm transition-shadow flex flex-col items-center text-center gap-3"
                            >
                                {/* Centered Icon */}
                                <div className={`w-12 h-12 rounded-full ${contact.color} flex items-center justify-center`}>
                                    <span className="text-white text-lg font-bold">!</span>
                                </div>

                                {/* Text Stacked Centered */}
                                <div>
                                    <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">
                                        {contact.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                                        {contact.category}
                                    </p>
                                </div>

                                {/* Phone Number */}
                                <p className={`text-sm font-bold ${contact.textColor}`}>
                                    {contact.phone}
                                </p>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
}