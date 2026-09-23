content = """import React, { useState, useEffect } from 'react';
import { 
    UsersIcon, HeartHandIcon, ShieldAlertIcon, MapIcon, CalendarIcon, MegaphoneIcon 
} from 'lucide-react';
import { 
    PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL;

// Reusable Stat Card
const StatCard = ({ title, value, icon, bgClass, textClass, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-4 p-6 rounded-xl shadow-sm border transition-all ${
            active ? 'ring-4 ring-offset-2 ring-[#1e7b2b] scale-105' : 'hover:scale-105'
        } ${bgClass}`}
    >
        <div className={`p-4 rounded-full bg-white/20 ${textClass}`}>
            {icon}
        </div>
        <div className="text-left">
            <p className={`text-sm font-medium opacity-90 ${textClass}`}>{title}</p>
            <p className={`text-3xl font-bold ${textClass}`}>{value}</p>
        </div>
    </button>
);

export default function DashboardAdminView() {
    const [stats, setStats] = useState<any>(null);
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [welfareFilters, setWelfareFilters] = useState({
        pwd: true, senior: true, solo: true, fourps: true
    });
    
    // Pagination & Residents
    const [residents, setResidents] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            const token = localStorage.getItem('access');
            const res = await fetch(`${API_URL}/api/dashboard-stats/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
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
            
            if (activeFilter === 'vulnerable') {
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
    }, [activeFilter, welfareFilters, page]);

    const handleFilterClick = (filter: string) => {
        if (activeFilter === filter) {
            setActiveFilter(null);
        } else {
            setActiveFilter(filter);
            setPage(1); // reset to page 1 on new filter
        }
    };

    const toggleWelfare = (key: string) => {
        setWelfareFilters(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
        setPage(1);
    };

    if (!stats) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;

    const COLORS = ['#1e7b2b', '#14b8a6', '#ef4444', '#f59e0b', '#3b82f6'];

    return (
        <div className="flex flex-col gap-8 w-full">
            {/* TOP: Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="Total Residents" 
                    value={stats.total_residents.toLocaleString()} 
                    icon={<UsersIcon />} 
                    bgClass="bg-[#1e7b2b]" textClass="text-white"
                    active={activeFilter === 'total'}
                    onClick={() => handleFilterClick('total')}
                />
                <StatCard 
                    title="Vulnerable Sectors" 
                    value={stats.welfare_beneficiaries.toLocaleString()} 
                    icon={<HeartHandIcon />} 
                    bgClass="bg-[#14b8a6]" textClass="text-white"
                    active={activeFilter === 'vulnerable'}
                    onClick={() => handleFilterClick('vulnerable')}
                />
                <StatCard 
                    title="Registered Voters" 
                    value={stats.registered_voters.toLocaleString()} 
                    icon={<ShieldAlertIcon />} 
                    bgClass="bg-blue-600" textClass="text-white"
                    active={activeFilter === 'voters'}
                    onClick={() => handleFilterClick('voters')}
                />
                <StatCard 
                    title="Youth (15-30)" 
                    value={stats.youth_residents.toLocaleString()} 
                    icon={<UsersIcon />} 
                    bgClass="bg-orange-500" textClass="text-white"
                    active={activeFilter === 'youth'}
                    onClick={() => handleFilterClick('youth')}
                />
            </div>

            {/* Sub-menu for Vulnerable Sectors */}
            {activeFilter === 'vulnerable' && (
                <div className="flex gap-4 p-4 bg-teal-50 border border-teal-200 rounded-lg shadow-sm">
                    <span className="font-bold text-teal-800 mr-2">Filter by Sector:</span>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.pwd} onChange={() => toggleWelfare('pwd')} className="w-4 h-4 text-teal-600 rounded" /> PWD</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.senior} onChange={() => toggleWelfare('senior')} className="w-4 h-4 text-teal-600 rounded" /> Senior Citizen</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.solo} onChange={() => toggleWelfare('solo')} className="w-4 h-4 text-teal-600 rounded" /> Solo Parent</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={welfareFilters.fourps} onChange={() => toggleWelfare('fourps')} className="w-4 h-4 text-teal-600 rounded" /> 4Ps</label>
                </div>
            )}

            {/* MIDDLE: Resident Registry (Conditional) */}
            {activeFilter && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800">Filtered Registry View</h3>
                        <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded-full">Displaying 10 rows</span>
                    </div>
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading residents...</div>
                    ) : (
                        <div className="overflow-x-auto">
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
                            {/* Server-Side Pagination */}
                            <div className="flex justify-between items-center px-6 py-3 bg-white border-t">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm font-semibold hover:bg-gray-50">Previous</button>
                                <span className="text-sm font-medium text-gray-600">Page {page} of {totalPages}</span>
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 border rounded-md disabled:opacity-50 text-sm font-semibold hover:bg-gray-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BOTTOM: Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Voter Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm text-center">Voter Registration Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.charts.voter} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                                    {stats.charts.voter.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Age Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm text-center">Age Demographics</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.charts.age} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} />
                                <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Purok Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm text-center">Population by Purok</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={stats.charts.purok} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} />
                                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Civil Status Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm text-center">Civil Status</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.charts.civil_status} outerRadius={80} dataKey="value" stroke="none">
                                    {stats.charts.civil_status.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index+2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}"""
with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("File written successfully using Python!")
