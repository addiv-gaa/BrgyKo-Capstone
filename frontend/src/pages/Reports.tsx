import React, { useState, useEffect } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

// --- Chart Colors ---
const GENDER_COLORS = ['#1d4ed8', '#ea580c']; // Blue for Male, Orange for Female
const WELFARE_COLORS = {
    senior: '#eab308', // Yellow
    pwd: '#3b82f6',    // Blue
    solo: '#16a34a',   // Green
    fourPs: '#dc2626'  // Red
};

// Helper to generate a fresh, empty year of data buckets
const getEmptyYearData = () => [
    { name: 'Jan', count: 0 }, { name: 'Feb', count: 0 }, { name: 'Mar', count: 0 },
    { name: 'Apr', count: 0 }, { name: 'May', count: 0 }, { name: 'Jun', count: 0 },
    { name: 'Jul', count: 0 }, { name: 'Aug', count: 0 }, { name: 'Sep', count: 0 },
    { name: 'Oct', count: 0 }, { name: 'Nov', count: 0 }, { name: 'Dec', count: 0 },
];

export default function DemographicsPage() {
    // State to hold our aggregated resident data
    const [stats, setStats] = useState({
        total: 0,
        male: 0,
        female: 0,
        senior: 0,
        pwd: 0,
        soloParent: 0,
        fourPs: 0
    });

    // NEW: State to hold the dynamic chart data
    const [monthlyCertificates, setMonthlyCertificates] = useState(getEmptyYearData());
    const [monthlyPermits, setMonthlyPermits] = useState(getEmptyYearData());

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    useEffect(() => {
        // 1. Fetch and aggregate resident data
        const fetchResidentStats = async () => {
            try {
                const response = await fetch(`${API_URL}/api/residents/`, { headers: getAuthHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    const residents = data.results || data; 

                    let maleCount = 0;
                    let femaleCount = 0;
                    let seniorCount = 0;
                    let pwdCount = 0;
                    let soloCount = 0;
                    let fourPsCount = 0;

                    residents.forEach((res: any) => {
                        // Gender
                        if (res.sex === 'Male') maleCount++;
                        if (res.sex === 'Female') femaleCount++;
                        
                        // Welfare
                        if (res.has_senior_citizen) seniorCount++;
                        if (res.has_pwd) pwdCount++;
                        if (res.has_solo_parent) soloCount++;
                        if (res.is_4ps_beneficiary) fourPsCount++;
                    });

                    setStats({
                        total: residents.length,
                        male: maleCount,
                        female: femaleCount,
                        senior: seniorCount,
                        pwd: pwdCount,
                        soloParent: soloCount,
                        fourPs: fourPsCount
                    });
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            }
        };

        // 2. NEW: Fetch Certificates and Permits
        // 2. Fetch Certificates and Permits
        const fetchDocumentStats = async () => {
            try {
                // Fetch both endpoints at the same time
                const [certResponse, permitResponse] = await Promise.all([
                    fetch(`${API_URL}/api/manager/certificates/`, { headers: getAuthHeaders() }),
                    fetch(`${API_URL}/api/manager/permits/`, { headers: getAuthHeaders() })
                ]);

                if (certResponse.ok && permitResponse.ok) {
                    const certData = await certResponse.json();
                    const permitData = await permitResponse.json();

                    const certificates = certData.results || certData;
                    const permits = permitData.results || permitData;

                    const certCounts = getEmptyYearData();
                    const permitCounts = getEmptyYearData();

                    // Filter for the current year
                    const targetYear = new Date().getFullYear(); 

                    // Process Certificates (ONLY count 'RELEASED' statuses)
                    certificates.forEach((cert: any) => {
                        const date = new Date(cert.date_requested);
                        if (date.getFullYear() === targetYear && cert.status === 'RELEASED') {
                            const monthIndex = date.getMonth(); // 0 = Jan, 11 = Dec
                            certCounts[monthIndex].count++;
                        }
                    });

                    // Process Permits (ONLY count 'RELEASED' statuses)
                    permits.forEach((permit: any) => {
                        const date = new Date(permit.date_requested);
                        if (date.getFullYear() === targetYear && permit.status === 'RELEASED') {
                            const monthIndex = date.getMonth();
                            permitCounts[monthIndex].count++;
                        }
                    });

                    // Spread the arrays into new references so Recharts updates the tooltips properly
                    setMonthlyCertificates([...certCounts]);
                    setMonthlyPermits([...permitCounts]);
                }
            } catch (error) { 
                console.error("Error fetching documents:", error); 
            }
        };

        fetchResidentStats();
        fetchDocumentStats();
    }, []);

    // Format data for Recharts
    const genderData = [
        { name: 'Male', value: stats.male },
        { name: 'Female', value: stats.female }
    ];

    const welfareData = [
        { name: 'Senior', count: stats.senior, fill: WELFARE_COLORS.senior },
        { name: 'PWD', count: stats.pwd, fill: WELFARE_COLORS.pwd },
        { name: 'Solo Parent', count: stats.soloParent, fill: WELFARE_COLORS.solo },
        { name: '4Ps', count: stats.fourPs, fill: WELFARE_COLORS.fourPs },
    ];

    // Helper to calculate percentages safely
    const getPercentage = (value: number) => {
        if (stats.total === 0) return 0;
        return Math.round((value / stats.total) * 100);
    };

    const currentYear = new Date().getFullYear();

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Demographic Reports</h1>
                        <p className="text-gray-500 text-sm">Barangay population analytics</p>
                    </div>

                    {/* Top Row: Gender Doughnut & Welfare Bar Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        
                        {/* Gender Doughnut Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Population by Gender</h2>
                            <div className="flex items-center justify-start h-64">
                                <div className="w-1/2 h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={genderData}
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {genderData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} Residents`, '']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    
                                    {/* Center Text (Total Population) */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-bold text-gray-900">{stats.total.toLocaleString()}</span>
                                    </div>
                                </div>
                                
                                {/* Custom Legend */}
                                <div className="w-1/2 flex flex-col justify-center gap-3 pl-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="w-3 h-3 bg-[#1d4ed8] rounded-sm"></span>
                                        <span className="text-gray-600">Male:</span>
                                        <span className="font-bold text-gray-900">{stats.male.toLocaleString()} <span className="text-gray-500 font-normal">({getPercentage(stats.male)}%)</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="w-3 h-3 bg-[#ea580c] rounded-sm"></span>
                                        <span className="text-gray-600">Female:</span>
                                        <span className="font-bold text-gray-900">{stats.female.toLocaleString()} <span className="text-gray-500 font-normal">({getPercentage(stats.female)}%)</span></span>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-100 text-sm text-gray-500">
                                        Total Population
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Welfare Coverage Bar Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Welfare Coverage</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={welfareData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                        <YAxis hide={true} /> {/* Hidden Y axis to match your design */}
                                        <Tooltip cursor={{ fill: '#f9fafb' }} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                                            {welfareData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Line Charts */}
                    <div className="grid grid-cols-1 gap-6">
                        
                        {/* Certificate Issuances */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-6">Monthly Certificate Issuances ({currentYear})</h2>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyCertificates} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        {/* Adjusted domain slightly to ensure the line doesn't get cut off when all values are 0 */}
                                        <YAxis hide={true} domain={['dataMin', 'dataMax + 5']} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Permit Issuances */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-6">Monthly Permit Issuances ({currentYear})</h2>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyPermits} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        <YAxis hide={true} domain={['dataMin', 'dataMax + 5']} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke="#ea580c" strokeWidth={3} dot={{ r: 4, fill: '#ea580c', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}