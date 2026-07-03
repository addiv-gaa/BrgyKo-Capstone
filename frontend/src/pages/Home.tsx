import Sidebar from "../components/sidebar";
import PageHeader from "../components/header";
import StatCard from "../components/statcard";

const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const FileBadgeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22h6a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M7 16.5 8 22l-3-1-3 1 1-5.5"/></svg>;
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const HeartHandIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08v0c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66"/></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const ChatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

function Home() {
  return (
    <div className="h-screen w-full flex flex-col bg-gray-100 overflow-hidden text-gray-800">
      <PageHeader />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />


          {/* We wrap the page content in a <main> tag that flexes to fill the remaining space */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#f4f7fa]">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, Administrator</h1>
              <p className="text-gray-500 text-sm">Barangay Overview — San Isidro, Cavite</p>
            </div>
          </div>
          
          {/* Stat Cards Grid */}
          {/* grid-cols-1 on mobile, 3 on tablet, 6 on large desktop */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            <StatCard 
              title="Total Residents" value="3,421" icon={<UsersIcon />} 
              bgClass="bg-[#eef5fd]" textClass="text-[#3b82f6]" 
            />
            <StatCard 
              title="Certs This Month" value="142" icon={<FileBadgeIcon />} 
              bgClass="bg-[#f0fdf4]" textClass="text-[#22c55e]" 
            />
            <StatCard 
              title="Items Borrowed" value="12" icon={<PackageIcon />} 
              bgClass="bg-[#fffbeb]" textClass="text-[#f59e0b]" 
            />
            <StatCard 
              title="Welfare Beneficiaries" value="430" icon={<HeartHandIcon />} 
              bgClass="bg-[#fef2f2]" textClass="text-[#ef4444]" 
            />
            <StatCard 
              title="SK Programs" value="6" icon={<StarIcon />} 
              bgClass="bg-[#faf5ff]" textClass="text-[#a855f7]" 
            />
            <StatCard 
              title="Chatbot Queries" value="89" icon={<ChatIcon />} 
              bgClass="bg-[#f8fafc]" textClass="text-[#64748b]" 
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Home


