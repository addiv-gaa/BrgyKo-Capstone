import { useState } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import ResidentModal, { type ResidentProperties } from '../components/ResidentModal';

// --- Mock Data ---
const initialResidents = [
    { id: 1, initials: 'MS', color: 'bg-[#1e40af]', name: 'Maria Santos', purok: 'Purok 1', age: 34, civilStatus: 'Married', welfare: '4Ps', welfareBg: 'bg-red-50', welfareText: 'text-red-600' },
    { id: 2, initials: 'Jd', color: 'bg-[#065f46]', name: 'Juan dela Cruz', purok: 'Purok 2', age: 67, civilStatus: 'Widowed', welfare: 'Senior', welfareBg: 'bg-orange-50', welfareText: 'text-orange-600' },
    { id: 3, initials: 'AR', color: 'bg-[#4338ca]', name: 'Ana Reyes', purok: 'Purok 1', age: 28, civilStatus: 'Single', welfare: 'None', welfareBg: 'bg-gray-100', welfareText: 'text-gray-500' },
    { id: 4, initials: 'RG', color: 'bg-[#ea580c]', name: 'Roberto Garcia', purok: 'Purok 3', age: 52, civilStatus: 'Married', welfare: 'PWD', welfareBg: 'bg-blue-50', welfareText: 'text-blue-600' },
    { id: 5, initials: 'LM', color: 'bg-[#d97706]', name: 'Liza Mendoza', purok: 'Purok 2', age: 41, civilStatus: 'Single', welfare: 'Solo Parent', welfareBg: 'bg-green-50', welfareText: 'text-green-700' },
    { id: 6, initials: 'PR', color: 'bg-[#dc2626]', name: 'Pedro Ramos', purok: 'Purok 4', age: 73, civilStatus: 'Married', welfare: 'Senior', welfareBg: 'bg-orange-50', welfareText: 'text-orange-600' },
    { id: 7, initials: 'CT', color: 'bg-[#1d4ed8]', name: 'Cynthia Torres', purok: 'Purok 3', age: 19, civilStatus: 'Single', welfare: 'None', welfareBg: 'bg-gray-100', welfareText: 'text-gray-500' },
    { id: 8, initials: 'EB', color: 'bg-[#0f766e]', name: 'Emmanuel Bautista', purok: 'Purok 1', age: 45, civilStatus: 'Married', welfare: 'None', welfareBg: 'bg-gray-100', welfareText: 'text-gray-500' },
];

export default function ResidentPage() {
    const [searchQuery, setSearchQuery] = useState('');

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedResident, setSelectedResident] = useState<ResidentProperties | null>(null);

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    {/* Header Section */}
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Information</h1>
                            <p className="text-gray-500 text-sm">Barangay Census Database</p>
                        </div>
                        
                        <button 
                            onClick={() => {
                                setModalMode('add');
                                setSelectedResident(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-[#1e40af] text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 shadow-sm transition-colors flex items-center gap-2"
                        >
                            <span>+ Add Resident</span>
                        </button>
                    </div>

                    {/* Data Table Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center bg-white">
                            <div className="relative flex-1 max-w-3xl">
                                <input 
                                    type="text" 
                                    placeholder="Search residents..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-200">
                                <thead>
                                    <tr className="bg-white border-b border-gray-200 text-xs text-gray-500 font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {initialResidents.map((resident) => (
                                        <tr key={resident.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-gray-600">{resident.id}</td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{resident.name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {/* Edit/View Button */}
                                                    <button 
                                                        onClick={() => {
                                                            setModalMode('edit');
                                                            // Mapping mock data to modal type for testing
                                                            setSelectedResident({ 
                                                                first_name: resident.name.split(' ')[0], 
                                                                last_name: resident.name.split(' ')[1] || '',
                                                                purok: resident.purok,
                                                                birth_date: '2000-01-01',
                                                                civil_status: resident.civilStatus,
                                                                relationship_to_head: 'Head',
                                                                is_4ps_beneficiary: resident.welfare === '4Ps',
                                                                has_senior_citizen: resident.welfare === 'Senior',
                                                                has_pwd: resident.welfare === 'PWD',
                                                                has_solo_parent: resident.welfare === 'Solo Parent'
                                                            });
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="p-1.5 border border-gray-200 rounded text-gray-500 hover:bg-gray-100"
                                                    >
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ResidentModal 
                    mode={modalMode}
                    resident={selectedResident}
                    onClose={() => setIsModalOpen(false)}
                    onSave={(data) => {
                        console.log("Saving Resident:", data);
                        setIsModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}