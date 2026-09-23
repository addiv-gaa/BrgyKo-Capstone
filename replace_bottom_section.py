import re

with open('frontend/src/components/DashboardAdminView.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\{/\* BOTTOM: Analytics Charts - MATCHING REPORTS\.TSX \*/\}.*?(?=</div>\n        </div>\n    \);\n})'

replacement = '''{/* BOTTOM: Analytics Charts - MATCHING REPORTS.TSX */}
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
                                                <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
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
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-3 h-3 bg-[#1d4ed8] rounded-sm shrink-0"></span>
                                    <span className="text-gray-600">Male:</span>
                                    <span className="font-bold text-gray-900">{maleCount.toLocaleString()} <span className="text-gray-500 font-normal">({getPercentage(maleCount, totalGender)}%)</span></span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="w-3 h-3 bg-[#ea580c] rounded-sm shrink-0"></span>
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
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} domain={['dataMin', 'dataMax + 2']} />
                                    <Tooltip formatter={(value: any) => [`${value} Queries`, 'Resident AI']} />
                                    <Area type="monotone" dataKey="ai" stroke="#a855f7" fill="#f3e8ff" strokeWidth={3} activeDot={{ r: 6, fill: '#a855f7', strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 3. Welfare Coverage (Vulnerable Sectors) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-800 mb-4">Welfare Coverage</h2>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.charts.welfare} margin={{ top: 20, right: 10, left: -25, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
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
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">Age Distribution</h2>
                        <div className="h-48 flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.charts.age} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={80} />
                                    <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* 5. Voter Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <h2 className="text-xs font-bold text-gray-800 mb-2 text-center">Voter Status</h2>
                        <div className="h-48 flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.charts.voter} innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                                        {stats.charts.voter.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 6. Purok Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <h2 className="text-xs font-bold text-gray-800 mb-4 text-center">Population by Purok</h2>
                        <div className="h-48 flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats.charts.purok} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6b7280' }} width={60} />
                                    <Tooltip cursor={{ fill: '#f9fafb' }} formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 7. Civil Status Distribution (Dashboard specific) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col">
                        <h2 className="text-xs font-bold text-gray-800 mb-2 text-center">Civil Status</h2>
                        <div className="h-48 flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.charts.civil_status} outerRadius={55} dataKey="value" stroke="none">
                                        {stats.charts.civil_status.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index+2) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`${value} Residents`, 'Count']} />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>'''

new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('frontend/src/components/DashboardAdminView.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Updated grid layout for charts to fit in 2 rows, keeping variables intact!")
