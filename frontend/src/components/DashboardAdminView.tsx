import React, { useState, useEffect } from 'react';
import { 
    UsersIcon, HeartHandshake, ShieldAlertIcon, MapIcon, CalendarIcon, MegaphoneIcon, Search 
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
    AreaChart, Area
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

const THEMES: Record<string, any> = {
    green: {
        wrapperHover: 'hover:border-green-300 hover:shadow-md',
        wrapperActive: 'border-green-400 shadow-md ring-1 ring-green-400 bg-green-50/10',
        icon: 'bg-green-50 text-green-600',
    },
    teal: {
        wrapperHover: 'hover:border-teal-300 hover:shadow-md',
        wrapperActive: 'border-teal-400 shadow-md ring-1 ring-teal-400 bg-teal-50/10',
        icon: 'bg-teal-50 text-teal-600',
    },
    blue: {
        wrapperHover: 'hover:border-blue-300 hover:shadow-md',
        wrapperActive: 'border-blue-400 shadow-md ring-1 ring-blue-400 bg-blue-50/10',
        icon: 'bg-blue-50 text-blue-600',
    },
    orange: {
        wrapperHover: 'hover:border-orange-300 hover:shadow-md',
        wrapperActive: 'border-orange-400 shadow-md ring-1 ring-orange-400 bg-orange-50/10',
        icon: 'bg-orange-50 text-orange-600',
    }
};

// Reusable Stat Card
const StatCard = ({ title, value, icon, active, onClick, colorKey }: any) => {
    const theme = THEMES[colorKey] || THEMES.blue;
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-4 p-6 rounded-xl shadow-sm border transition-all group ${
                active 
                    ? theme.wrapperActive 
                    : `bg-white border-gray-200 ${theme.wrapperHover}`
            }`}
        >
            <div className={`p-4 rounded-full transition-transform group-hover:scale-110 ${theme.icon}`}>
                {icon}
            </div>
            <div className="text-left">
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-2xl font-semibold text-gray-700 mt-1">{value}</p>
            </div>
        </button>
    );
};

export default function DashboardAdminView() {
    const [stats, setStats] = useState<any>(null);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [welfareFilters, setWelfareFilters] = useState({
        pwd: true, senior: true, solo: true, fourps: true
    });
    
    // Pagination & Residents
    const [residents, setResidents] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [purokFilter, setPurokFilter] = useState('');
    const [sexFilter, setSexFilter] = useState('');
    const [civilStatusFilter, setCivilStatusFilter] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('access');
            const res = await fetch(`${API_URL}/api/dashboard-stats/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
                
                // Process Monthly AI Data
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const emptyMonthlyData = monthNames.map(m => ({ name: m, ai: 0 }));
                if (data.charts.monthly_ai) {
                    data.charts.monthly_ai.forEach((item: any) => {
                        emptyMonthlyData[item.created_at__month - 1].ai = item.ai;
                    });
                }
                setMonthlyData(emptyMonthlyData);
            }
        };
        fetchStats();
    }, []);

    useEffect(() => {
        if (!activeFilter) return;
        
        const fetchFilteredResidents = async () => {
            setLoading(true);
            const token = localStorage.getItem('access');
            
            let query = `?page=${page}&page_size=10`;
            if (activeFilter === 'voters') query += '&is_registered_voter=True';
            if (activeFilter === 'youth') query += '&is_youth=true';
            
            if (searchQuery) query += '&search=' + encodeURIComponent(searchQuery);
            if (purokFilter) query += '&purok=' + encodeURIComponent(purokFilter);
            if (sexFilter) query += '&sex=' + encodeURIComponent(sexFilter);
            if (civilStatusFilter) query += '&civil_status=' + encodeURIComponent(civilStatusFilter);
            
            if (activeFilter === 'vulnerable') {
                const noWelfareChecked = !welfareFilters.pwd && !welfareFilters.senior && !welfareFilters.solo && !welfareFilters.fourps;
                if (noWelfareChecked) {
                    setResidents([]);
                    setTotalPages(1);
                    setLoading(false);
                    return;
                }
                
                if (welfareFilters.pwd) query += '&is_pwd=True';
                if (welfareFilters.senior) query += '&is_senior_citizen=True';
                if (welfareFilters.solo) query += '&is_solo_parent=True';
                if (welfareFilters.fourps) query += '&is_4ps_beneficiary=True';
            }

            const res = await fetch(`${API_URL}/api/residents/${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setResidents(data.results || data);
                setTotalPages(Math.ceil(data.count / 10) || 1);
            }
            setLoading(false);
        };
        fetchFilteredResidents();
    }, [activeFilter, welfareFilters, page, searchQuery, purokFilter, sexFilter, civilStatusFilter]);

    const handleFilterClick = (filter: string) => {
        if (activeFilter === filter) {
            setActiveFilter(null);
        } else {
            setActiveFilter(filter);
            setPage(1); // reset to page 1 on new filter
            setSearchQuery('');
            setPurokFilter('');
            setSexFilter('');
            setCivilStatusFilter('');
        }
    };

    const toggleWelfare = (key: string) => {
        setWelfareFilters(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
        setPage(1);
    };

    if (!stats) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const BINARY_COLORS = ['#14532d', '#16a34a'];
    const SPECTRUM_COLORS = ['#16a34a', '#022c22', '#065f46', '#4ade80'];
    const WELFARE_COLORS: Record<string, string> = {
        '4Ps': '#9333ea',        // purple-600
        'PWD': '#2563eb',        // blue-600
        'Solo Parent': '#db2777',// pink-600
        'Senior': '#ea580c',     // orange-600
    };

    const getPercentage = (value: number, total: number) => {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    };

    const maleCount = stats.charts.gender?.find((g: any) => g.name === 'Male')?.value || 0;
    const femaleCount = stats.charts.gender?.find((g: any) => g.name === 'Female')?.value || 0;
    const totalGender = maleCount + femaleCount;
    const currentYear = new Date().getFullYear();

    const getCount = (arr: any[], name: string) => arr?.find((item: any) => item.name === name)?.value || 0;
    const count4ps = getCount(stats.charts.welfare, '4Ps');
    const countPwd = getCount(stats.charts.welfare, 'PWD');
    const countSolo = getCount(stats.charts.welfare, 'Solo Parent');
    const countSenior = getCount(stats.charts.welfare, 'Senior');
    const countReg = getCount(stats.charts.voter, 'Registered');
    const countUnreg = getCount(stats.charts.voter, 'Not Registered');
    const countSingle = getCount(stats.charts.civil_status, 'Single');
    const countMarried = getCount(stats.charts.civil_status, 'Married');
    const countWidowed = getCount(stats.charts.civil_status, 'Widowed');


    return (
        <div className="flex flex-col gap-8 w-full pb-8">
            {/* TOP: Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Residents" 
                    value={stats.total_residents.toLocaleString()} 
                    icon={<UsersIcon />} 
                    active={activeFilter === 'total'}
                    onClick={() => handleFilterClick('total')}
                    colorKey="green"
                />
                <StatCard 
                    title="Vulnerable Sectors" 
                    value={stats.welfare_beneficiaries.toLocaleString()} 
                    icon={<HeartHandshake />} 
                    active={activeFilter === 'vulnerable'}
                    onClick={() => handleFilterClick('vulnerable')}
                    colorKey="teal"
                />
                <StatCard 
                    title="Registered Voters" 
                    value={stats.registered_voters.toLocaleString()} 
                    icon={<ShieldAlertIcon />} 
                    active={activeFilter === 'voters'}
                    onClick={() => handleFilterClick('voters')}
                    colorKey="blue"
                />
                <StatCard 
                    title="Youth (15-30)" 
                    value={stats.youth_residents.toLocaleString()} 
                    icon={<UsersIcon />} 
                    active={activeFilter === 'youth'}
                    onClick={() => handleFilterClick('youth')}
                    colorKey="orange"
                />
            </div>

            {/* Sub-menu for Vulnerable Sectors */}
            {activeFilter === 'vulnerable' && (
                <div className="flex gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                    <span className="font-bold text-gray-800 mr-2">Filter by Sector:</span>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.pwd} onChange={() => toggleWelfare('pwd')} className="w-4 h-4 text-blue-600 rounded" /> PWD</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.senior} onChange={() => toggleWelfare('senior')} className="w-4 h-4 text-orange-600 rounded" /> Senior Citizen</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.solo} onChange={() => toggleWelfare('solo')} className="w-4 h-4 text-pink-600 rounded" /> Solo Parent</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.fourps} onChange={() => toggleWelfare('fourps')} className="w-4 h-4 text-purple-600 rounded" /> 4Ps</label>
                </div>
            )}

            {/* MIDDLE: Resident Registry (Conditional) */}
            {activeFilter && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Filtered Registry View</h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Displaying 10 rows</span>
                    </div>
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search residents by name..." 
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    value={purokFilter} 
                                    onChange={e => { setPurokFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Puroks</option>
                                    {stats.charts.purok?.map((p: any) => (
                                        <option key={p.name} value={p.name}>{p.name}</option>
                                    ))}
                                </select>
                                <select 
                                    value={sexFilter} 
                                    onChange={e => { setSexFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Sexes</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                                <select 
                                    value={civilStatusFilter} 
                                    onChange={e => { setCivilStatusFilter(e.target.value); setPage(1); }}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="Single">Single</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Separated">Separated</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className={`overflow-x-auto transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Purok</th>
                                    <th className="px-6 py-3">Sex</th>
                                    <th className="px-6 py-3">Age Group</th>
                                </tr>
                            </thead>
                            <tbody>
                                {residents.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No residents found.</td></tr>
                                ) : (
                                    residents.map(r => (
                                        <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium">{r.first_name} {r.last_name}</td>
                                            <td className="px-6 py-3">{r.purok}</td>
                                            <td className="px-6 py-3">{r.sex}</td>
                                            <td className="px-6 py-3">
                                                {r.is_senior_citizen ? 'Senior' : (activeFilter === 'youth' ? 'Youth' : 'Adult')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        <div className="flex justify-between items-center px-6 py-3 bg-white border-t">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm font-semibold hover:bg-gray-50">Previous</button>
                            <span className="text-sm font-medium text-gray-600">Page {page} of {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm font-semibold hover:bg-gray-50">Next</button>
                        </div>
                    </div>
                </div>
            )}

            {/* BOTTOM: Analytics Charts - 2 ROWS LAYOUT */}
            <div className="flex flex-col gap-6">
                
                {/* ROW 1: 3 Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Population by Gender */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 mb-4">Population by Gender</h2>
                        <div className="flex items-center justify-start h-64">
                            <div className="w-1/2 h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={stats.charts.gender} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                            {stats.charts.gender?.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={BINARY_COLORS[index % BINARY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: any) => [`${value} Residents`, '']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-xl font-bold text-gray-900">{totalGender.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="w-1/2 flex flex-col justify-center gap-3 pl-2">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="w-3 h-3 bg-[#14532d] rounded-sm shrink-0"></span>
                                    <span className="text-gray-600">Male:</span>
                                    <span className="font-bold text-gray-900">{maleCount.toLocaleString()} <span className="text-gray-500 font-normal">({getPercentage(maleCount, totalGender)}%)</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="w-3 h-3 bg-[#16a34a] rounded-sm shrink-0"></span>
                                    <span className="text-gray-600">Female:</span>
                                    <span className="font-bold text-gray-900">{femaleCount.toLocaleString()} <span className="text-gray-500 font-normal">({getPercentage(femaleCount, totalGender)}%)</span></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Resident AI Activity (Area Chart) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-bold text-gray-800">AI Activity ({currentYear})</h2>
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">
                                Queries: {stats.chatbot_queries?.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} domain={['dataMin', 'dataMax + 2']} />
                                    <Tooltip formatter={(value: any) => [`${value} Queries`, 'Resident AI']} />
                                    <Area type="monotone" dataKey="ai" stroke="#166534" fill="#dcfce7" strokeWidth={3} activeDot={{ r: 6, fill: '#166534', strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Welfare Coverage (Vulnerable Sectors) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-sm font-bold text-gray-800">Vulnerable Sectors</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold">4Ps: {count4ps.toLocaleString()}</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">PWD: {countPwd.toLocaleString()}</span>
                                <span className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-[10px] font-bold">Solo: {countSolo.toLocaleString()}</span>
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold">Senior: {countSenior.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.charts.welfare} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>
                                        {stats.charts.welfare.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={WELFARE_COLORS[entry.name] || '#14b8a6'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* ROW 2: 4 Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* 4. Age Bracket Distribution (Horizontal Bar Chart) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 mb-4 text-center">Age Distribution</h2>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.charts.age} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={95} />
                                    <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Bar dataKey="value" fill="#15803d" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* 5. Voter Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Voter Status</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">Reg: {countReg.toLocaleString()}</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold">Unreg: {countUnreg.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.charts.voter} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                                        {stats.charts.voter.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={BINARY_COLORS[index % BINARY_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 6. Purok Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 mb-4 text-center">Population by Purok</h2>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.charts.purok} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} width={95} />
                                    <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Bar dataKey="value" fill="#15803d" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 7. Civil Status Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-sm font-bold text-gray-800">Civil Status</h2>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-1 rounded text-[10px] font-bold">Single: {countSingle.toLocaleString()}</span>
                                <span className="bg-orange-100 text-orange-700 px-1.5 py-1 rounded text-[10px] font-bold">Married: {countMarried.toLocaleString()}</span>
                                <span className="bg-red-100 text-red-700 px-1.5 py-1 rounded text-[10px] font-bold">Widowed: {countWidowed.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.charts.civil_status} outerRadius={55} dataKey="value" stroke="none">
                                        {stats.charts.civil_status.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={SPECTRUM_COLORS[index % SPECTRUM_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
