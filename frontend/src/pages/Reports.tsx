import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL;

function DemographicsAiAssistant() {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAskAi = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsAnalyzing(true);
        try {
            const res = await fetch(`${API_URL}/api/reports/demographics-ai/`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query })
            });

            const data = await res.json();
            if (res.ok) setResponse(data.reply);
            else alert(data.error || "Failed to analyze data.");
        } catch (error) {
            console.error(error);
            alert("Network error connecting to staff AI.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-6 mb-8">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">AI</div>
                <div>
                    <h3 className="text-base font-bold text-gray-900">Demographic Intelligence</h3>
                    <p className="text-xs text-gray-500">Ask strategic questions about the RBI data.</p>
                </div>
            </div>

            <form onSubmit={handleAskAi} className="flex gap-2 mb-4">
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g., Summarize the vulnerabilities in our Labor Force." className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" disabled={isAnalyzing} />
                <button type="submit" disabled={isAnalyzing || !query.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                    {isAnalyzing ? "Analyzing..." : "Ask AI"}
                </button>
            </form>

            {response && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm text-gray-800 leading-relaxed overflow-hidden">
                    <ReactMarkdown 
                        components={{
                            p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold text-indigo-950" {...props} />
                        }}
                    >
                        {response}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}

export default function Reports() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/reports/rbi-form-c/`, { credentials: 'include' })
            .then(res => res.json())
            .then(resData => {
                setData(resData);
                setIsLoading(false);
            })
            .catch(error => {
                console.error("Error fetching RBI Form C data:", error);
                setIsLoading(false);
            });
    }, []);

    const exportToExcel = async () => {
        try {
            const res = await fetch(`${API_URL}/api/reports/rbi-form-c/download/`, { credentials: 'include' });
            if (!res.ok) throw new Error("Failed to download report");
            
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "RBI_Form_C.xlsx";
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Error downloading styled Excel report.");
        }
    };

    if (isLoading || !data) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <p className="text-gray-500 font-medium">Loading Form C Data...</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-hidden text-gray-800">
            

            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto">
                    <DemographicsAiAssistant />

                    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                        <div className="flex justify-between items-end mb-6 border-b border-gray-100 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">RBI FORM C (Revised 2024)</h2>
                                <p className="text-gray-500 text-sm">Semestral Monitoring Report</p>
                            </div>
                            <button onClick={exportToExcel} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Excel
                            </button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border p-2 font-bold w-1/2">INDICATORS</th>
                                        <th className="border p-2 font-bold text-center">MALE</th>
                                        <th className="border p-2 font-bold text-center">FEMALE</th>
                                        <th className="border p-2 font-bold text-center text-indigo-700 bg-indigo-50">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-gray-50 font-bold"><td colSpan={4} className="border p-2">Population by Age Bracket:</td></tr>
                                    {Object.entries(data.age_brackets).map(([k, v]: [string, any]) => (
                                        <tr key={k}>
                                            <td className="border p-2 pl-6">{k}</td>
                                            <td className="border p-2 text-center">{v.male}</td>
                                            <td className="border p-2 text-center">{v.female}</td>
                                            <td className="border p-2 text-center font-bold bg-indigo-50/30">{v.total}</td>
                                        </tr>
                                    ))}

                                    <tr className="bg-gray-50 font-bold"><td colSpan={4} className="border p-2">Population by Sector:</td></tr>
                                    {[
                                        {label: 'Labor Force', key: 'labor_force'},
                                        {label: 'Unemployed', key: 'unemployed'},
                                        {label: 'Out of School Children (OSC) (6-14)', key: 'osc'},
                                        {label: 'Out of School Youth (OSY) (15-24)', key: 'osy'},
                                        {label: 'Person with Disabilities (PWDs)', key: 'pwd'},
                                        {label: 'Overseas Filipino Workers (OFWs)', key: 'ofw'},
                                        {label: 'Solo Parents', key: 'solo_parent'},
                                        {label: 'Vulnerable Groups', key: 'vulnerable'},
                                        {label: 'Indigenous Peoples (IPs)', key: 'indigenous'},
                                    ].map(s => {
                                        const v = data.sectors[s.key];
                                        return (
                                            <tr key={s.key}>
                                                <td className="border p-2 pl-6">{s.label}</td>
                                                <td className="border p-2 text-center">{v.male}</td>
                                                <td className="border p-2 text-center">{v.female}</td>
                                                <td className="border p-2 text-center font-bold bg-indigo-50/30">{v.total}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
