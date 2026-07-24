import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const PageHeader = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState("My Profile");

    // Extract the username from the stored JWT token
    useEffect(() => {
        const token = localStorage.getItem('access');
        if (token) {
            try {
                // Decode the payload portion of the JWT token
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                if (payload.username) {
                    setUsername(payload.username);
                }
            } catch (error) {
                console.error("Failed to decode token", error);
            }
        }
    }, []);

    const LogoutClicked = () => navigate('/logout');
    const ProfileClicked = () => navigate('/profile'); // Directs them to the Profile page

    return (
        <header className="h-15 w-full bg-blue-600 flex items-center justify-between p-1 px-6 sticky top-0 shrink-0 z-50 shadow-md">
            
            {/* Logo / Brand Name */}
            <div className="flex flex-col text-sm/[1.2] text-white font-bold cursor-default">
                <span>BarangayKo</span>
            </div>
            
            {/* Right Side Actions Container */}
            <div className="flex items-center gap-5">
                
                {/* Username / Profile Link */}
                <button 
                    onClick={ProfileClicked}
                    className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors text-sm font-semibold"
                >
                    {/* User Avatar Icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {username}
                </button>

                {/* Subtle Divider Line */}
                <div className="h-6 w-px bg-white/30"></div>

                {/* Logout Button */}
                <button 
                    onClick={LogoutClicked}
                    className="flex items-center gap-2 px-4 py-1.5 bg-transparent border-2 border-white/80 hover:bg-white/10 text-white rounded-full text-sm font-bold transition-colors"
                >
                    {/* Logout Icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>

        </header>
    );
};

export default PageHeader;