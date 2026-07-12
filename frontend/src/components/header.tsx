import { useNavigate } from "react-router-dom";

const PageHeader = () => {
    const navigate = useNavigate();
    const LogoutClicked = () => navigate('/logout')

    return (
        // Added 'justify-between' to separate the logo and the button
        <header className="h-15 w-full bg-blue-600 flex items-center justify-between p-1 px-6 sticky top-0 shrink-0 z-50 shadow-md">
            
            {/* Logo / Brand Name */}
            <div className="flex flex-col text-sm/[1.2] text-white font-bold">
                <span>BarangayKo</span>
            </div>
            
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

        </header>
    );
};

export default PageHeader;