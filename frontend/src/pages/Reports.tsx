import React, { useState, useEffect } from 'react';
import PageHeader from "../components/header";
import Sidebar from "../components/sidebar";
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
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

// Helper to generate a fresh, unified year of data buckets
const getEmptyYearData = () => [
    { name: 'Jan', certs: 0, revenue: 0, ai: 0 }, { name: 'Feb', certs: 0, revenue: 0, ai: 0 }, 
    { name: 'Mar', certs: 0, revenue: 0, ai: 0 }, { name: 'Apr', certs: 0, revenue: 0, ai: 0 }, 
    { name: 'May', certs: 0, revenue: 0, ai: 0 }, { name: 'Jun', certs: 0, revenue: 0, ai: 0 },
    { name: 'Jul', certs: 0, revenue: 0, ai: 0 }, { name: 'Aug', certs: 0, revenue: 0, ai: 0 }, 
    { name: 'Sep', certs: 0, revenue: 0, ai: 0 }, { name: 'Oct', certs: 0, revenue: 0, ai: 0 }, 
    { name: 'Nov', certs: 0, revenue: 0, ai: 0 }, { name: 'Dec', certs: 0, revenue: 0, ai: 0 },
];

// Helper to calculate exact age from birthdate
const calculateAge = (dobString: string) => {
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

export default function DemographicsPage() {
    // State for base metrics
    const [stats, setStats] = useState({
        total: 0, male: 0, female: 0,
        senior: 0, pwd: 0, soloParent: 0, fourPs: 0
    });

    // NEW: State for Age Brackets
    const [ageData, setAgeData] = useState([
        { name: '0-14 (Children)', count: 0 },
        { name: '15-30 (Youth/SK)', count: 0 },
        { name: '31-59 (Working)', count: 0 },
        { name: '60+ (Seniors)', count: 0 }
    ]);

    // State for time-series charts (Certificates, Revenue, AI Queries)
    const [monthlyData, setMonthlyData] = useState(getEmptyYearData());

    const getAuthHeaders = () => {
        const token = localStorage.getItem('access'); 
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    useEffect(() => {
        // 1. Fetch and aggregate resident demographics & ages
        const fetchResidentStats = async () => {
            try {
                const response = await fetch(`${API_URL}/api/residents/`, { headers: getAuthHeaders() });
                if (response.ok) {
                    const data = await response.json();
                    const residents = data.results || data; 

                    let maleCount = 0, femaleCount = 0;
                    let seniorCount = 0, pwdCount = 0, soloCount = 0, fourPsCount = 0;
                    let children = 0, youth = 0, working = 0, seniors = 0;

                    residents.forEach((res: any) => {
                        // Gender
                        if (res.sex === 'Male') maleCount++;
                        if (res.sex === 'Female') femaleCount++;
                        
                        // Welfare
                        if (res.is_senior_citizen) seniorCount++;
                        if (res.is_pwd) pwdCount++;
                        if (res.is_solo_parent) soloCount++;
                        if (res.is_4ps_beneficiary) fourPsCount++;

                        // Age Brackets
                        if (res.birth_date) {
                            const age = calculateAge(res.birth_date);
                            if (age <= 14) children++;
                            else if (age <= 30) youth++;
                            else if (age <= 59) working++;
                            else seniors++;
                        }
                    });

                    setStats({
                        total: residents.length,
                        male: maleCount, female: femaleCount,
                        senior: seniorCount, pwd: pwdCount,
                        soloParent: soloCount, fourPs: fourPsCount
                    });

                    setAgeData([
                        { name: '0-14 (Children)', count: children },
                        { name: '15-30 (Youth/SK)', count: youth },
                        { name: '31-59 (Working)', count: working },
                        { name: '60+ (Seniors)', count: seniors }
                    ]);
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            }
        };

        // 2. Fetch Time-Series Data (Certificates & AI Queries)
        const fetchTimeSeriesData = async () => {
            try {
                // Fetch endpoints in parallel (Catch AI errors so it doesn't break certs if endpoint differs)
                const [certResponse, aiResponse] = await Promise.all([
                    fetch(`${API_URL}/api/manager/certificates/`, { headers: getAuthHeaders() }).catch(() => null),
                    fetch(`${API_URL}/api/ai-queries/`, { headers: getAuthHeaders() }).catch(() => null)
                ]);

                const yearData = getEmptyYearData();
                const targetYear = new Date().getFullYear(); 

                // Process Certificates & Revenue
                if (certResponse && certResponse.ok) {
                    const certData = await certResponse.json();
                    const certificates = certData.results || certData;

                    certificates.forEach((cert: any) => {
                        const date = new Date(cert.date_requested);
                        if (date.getFullYear() === targetYear && cert.status === 'RELEASED') {
                            const monthIndex = date.getMonth(); 
                            yearData[monthIndex].certs++;
                            yearData[monthIndex].revenue += 50; 
                        }
                    });
                }

                // Process AI Queries
                if (aiResponse && aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    const queries = aiData.results || aiData;

                    queries.forEach((q: any) => {
                        const date = new Date(q.created_at);
                        if (date.getFullYear() === targetYear) {
                            const monthIndex = date.getMonth();
                            yearData[monthIndex].ai++;
                        }
                    });
                }

                setMonthlyData([...yearData]);

            } catch (error) { 
                console.error("Error fetching time-series data:", error); 
            }
        };

        fetchResidentStats();
        fetchTimeSeriesData();
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

    const getPercentage = (value: number) => {
        if (stats.total === 0) return 0;
        return Math.round((value / stats.total) * 100);
    };

    const currentYear = new Date().getFullYear();
    
    // Header Totals
    const totalCertificates = monthlyData.reduce((sum, month) => sum + month.certs, 0);
    const totalRevenue = monthlyData.reduce((sum, month) => sum + month.revenue, 0);
    const totalAiQueries = monthlyData.reduce((sum, month) => sum + month.ai, 0);

    return (
        <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
            <PageHeader />
            
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
                    
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Demographic Reports</h1>
                        <p className="text-gray-500 text-sm">Barangay population and service analytics</p>
                    </div>

                    {/* Row 1: Gender Doughnut & Welfare Bar Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Population by Gender</h2>
                            <div className="flex items-center justify-start h-64">
                                <div className="w-1/2 h-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={genderData} innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                                                {genderData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [`${value} Residents`, '']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-xl font-bold text-gray-900">{stats.total.toLocaleString()}</span>
                                    </div>
                                </div>
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
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Welfare Coverage</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={welfareData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
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

                    {/* Row 2: Age Brackets & AI Assistant Queries */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        
                        {/* Age Bracket Distribution (Horizontal Bar Chart) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h2 className="text-sm font-bold text-gray-800 mb-4">Age Bracket Distribution</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart layout="vertical" data={ageData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={120} />
                                        <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* AI Assistant Queries (Area Chart) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-gray-800">AI Assistant Activity ({currentYear})</h2>
                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">
                                    Total Queries: {totalAiQueries.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} domain={['dataMin', 'dataMax + 2']} />
                                        <Tooltip formatter={(value: any) => [`${value} Queries`, 'AI Assistant']} />
                                        <Area type="monotone" dataKey="ai" stroke="#a855f7" fill="#f3e8ff" strokeWidth={3} activeDot={{ r: 6, fill: '#a855f7', strokeWidth: 0 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Row 3: Certificate Issuances & Revenue */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-gray-800">Monthly Certificate Issuances ({currentYear})</h2>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                    Total Issued: {totalCertificates.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} domain={['dataMin', 'dataMax + 5']} />
                                        <Tooltip formatter={(value: any) => [`${value} Issued`, 'Certificates']} />
                                        <Line type="monotone" dataKey="certs" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4, fill: '#1d4ed8', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-sm font-bold text-gray-800">Certificate Revenue ({currentYear})</h2>
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                                    Total Revenue: ₱{totalRevenue.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={(value) => `₱${value}`} />
                                        <Tooltip formatter={(value: any) => [`₱${Number(value || 0).toLocaleString()}`, 'Revenue']} cursor={{ fill: '#f9fafb' }} />
                                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}