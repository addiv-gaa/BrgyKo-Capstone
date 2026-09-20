import re

def main():
    path = r'c:\VSCode Projects\Capstone Project\frontend\src\pages\AdminHub.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add log filters states
    states_insert = """    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [logPage, setLogPage] = useState(1);
    const [logTotalPages, setLogTotalPages] = useState(1);
    const [logActionFilter, setLogActionFilter] = useState('');
    const [logModelFilter, setLogModelFilter] = useState('');
    const [logUserFilter, setLogUserFilter] = useState('');"""
    
    content = re.sub(r'    const \[logs, setLogs\] = useState<AuditLog\[\]>\(\[\]\);', states_insert, content)

    # 2. Add fetchLogs
    fetch_logs_fn = """
    const fetchLogs = async () => {
        const token = localStorage.getItem('access');
        if (!token) return;
        try {
            const queryParams = new URLSearchParams({
                page: logPage.toString(),
                page_size: '15',
                action: logActionFilter,
                model: logModelFilter,
                user: logUserFilter
            });
            const res = await fetch(`${API_URL}/api/admin/audit-logs/?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const logsData = await res.json();
                setLogs(logsData.results ? logsData.results : (Array.isArray(logsData) ? logsData : []));
                if (logsData.num_pages) setLogTotalPages(logsData.num_pages);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (isAuthorized) {
            fetchLogs();
        }
    }, [logPage, logActionFilter, logModelFilter, logUserFilter, isAuthorized]);
"""
    # Insert it right before fetchData
    content = content.replace("    const fetchData = async () => {", fetch_logs_fn + "\n    const fetchData = async () => {")

    # 3. Remove logs fetching from fetchData
    fetch_data_old = """            const [logsRes, staffRes, settingsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/audit-logs/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/staff-management/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/system/settings/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (logsRes.ok) {
                const logsData = await logsRes.json();
                setLogs(logsData.results ? logsData.results : (Array.isArray(logsData) ? logsData : []));
            }
            if (staffRes.ok) setStaffList(await staffRes.json());
            if (settingsRes.ok) setSettingsForm(await settingsRes.json());"""
            
    fetch_data_new = """            const [staffRes, settingsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/staff-management/`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_URL}/api/system/settings/`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (staffRes.ok) setStaffList(await staffRes.json());
            if (settingsRes.ok) setSettingsForm(await settingsRes.json());"""
            
    content = content.replace(fetch_data_old, fetch_data_new)

    # 4. Modify LOGS TAB CONTENT
    logs_tab_old = """                                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                    <h3 className="text-base font-bold text-gray-900">System Activity Logs</h3>
                                    <button onClick={fetchData} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1.5 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Sync Latest
                                    </button>
                                </div>
                                <div className="overflow-y-auto flex-1">"""
                                
    logs_tab_new = """                                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center bg-white shrink-0">
                                    <h3 className="text-base font-bold text-gray-900">System Activity Logs</h3>
                                    <button onClick={fetchLogs} className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1.5 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        Sync Latest
                                    </button>
                                </div>
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap gap-4 items-center shrink-0">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Action:</label>
                                        <select value={logActionFilter} onChange={e => {setLogActionFilter(e.target.value); setLogPage(1);}} className="text-sm border-gray-200 rounded-md py-1.5 px-3 bg-white">
                                            <option value="">All Actions</option>
                                            <option value="Created">Created</option>
                                            <option value="Updated">Updated</option>
                                            <option value="Deleted">Deleted</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold text-gray-500 uppercase">Module:</label>
                                        <select value={logModelFilter} onChange={e => {setLogModelFilter(e.target.value); setLogPage(1);}} className="text-sm border-gray-200 rounded-md py-1.5 px-3 bg-white">
                                            <option value="">All Modules</option>
                                            <option value="Resident">Residents</option>
                                            <option value="UserProfile">User Profiles</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 flex-1">
                                        <input type="text" placeholder="Search by username..." value={logUserFilter} onChange={e => {setLogUserFilter(e.target.value); setLogPage(1);}} className="text-sm border border-gray-200 rounded-md py-1.5 px-3 w-full max-w-xs" />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1">"""
                                
    content = content.replace(logs_tab_old, logs_tab_new)

    # 5. Add Pagination after table
    table_end_old = """                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}"""
                        
    table_end_new = """                                        </tbody>
                                    </table>
                                </div>
                                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
                                    <span className="text-sm text-gray-500 font-semibold">Page {logPage} of {logTotalPages}</span>
                                    <div className="flex gap-2">
                                        <button disabled={logPage <= 1} onClick={() => setLogPage(p => Math.max(1, p - 1))} className="px-4 py-1.5 text-sm font-semibold border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-gray-700">Previous</button>
                                        <button disabled={logPage >= logTotalPages} onClick={() => setLogPage(p => p + 1)} className="px-4 py-1.5 text-sm font-semibold border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors text-gray-700">Next</button>
                                    </div>
                                </div>
                            </div>
                        )}"""

    content = content.replace(table_end_old, table_end_new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print("Success!")

if __name__ == '__main__':
    main()
