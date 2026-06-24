
const Sidebar = () => {
        return(
            <div className="h-screen w-64 m-0 text-left flex flex-col bg-gray-300 text-black shadow-lg shrink-0">
                <div>
                    <div className="sidebar-category">SERVICES</div>
                    <div className="sidebar-button">Dashboard</div>
                    <div className="sidebar-button">Request Certificate</div>
                    <div className="sidebar-button">Request Permit</div>
                    <div className="sidebar-button">Ai Assistant</div>
                </div>
                <div>
                    <div className="sidebar-category">COMMUNITY</div>
                    <div className="sidebar-button">Announcements</div>
                    <div className="sidebar-button">Emergency Contacts</div>
                    <div className="sidebar-button">Barangay Officals</div>
                </div>
                <div>
                    <div className="sidebar-category">ADMINISTRATION</div>
                    <div className="sidebar-button">Residents</div>
                    <div className="sidebar-button">Inventory</div>
                    <div className="sidebar-button">Welfare</div>
                    <div className="sidebar-button">SK Module</div>
                    <div className="sidebar-button">SMS Blast</div>
                    <div className="sidebar-button">Reports</div>
                    <div className="sidebar-button">Geo Mapping</div>
                    <div className="sidebar-button">Documents</div>
                    <div className="sidebar-button">Cert Requests</div>
                </div>
            </div>
        )
    };

export default Sidebar;