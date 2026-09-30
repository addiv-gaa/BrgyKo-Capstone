import { createContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
    roles: string[];
    role?: string;
    first_name?: string;
    username?: string;
}

interface SystemSettings {
    barangay_name: string;
    captain_name: string;
    barangay_hall_address: string;
    official_contact_email: string;
    official_contact_number: string;
    barangay_seal_url: string;
    emergency_hotline: string;
    police_hotline: string;
    fire_hotline: string;
    ai_chatbot_enabled: boolean;
    accept_permit_requests: boolean;
    accept_reservations: boolean;
    maintenance_mode: boolean;
    max_pending_requests_per_user: number;
    reservation_lead_time_days: number;
}

interface UserData {
    username: string;
    first_name: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    settings: SystemSettings | null;
    login: (userData: UserData) => void;
    logout: () => void;
    refreshSettings: () => void;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isAppLoading, setIsAppLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/system/settings/`);
            if (res.ok) {
                const data = await res.json();
                setSettings(data);
            }
        } catch (error) {
            console.error("Failed to fetch system settings", error);
        }
    };

    const refreshUser = async () => {
        try {
            // Fetch the current user from the backend using the HttpOnly cookie
            const res = await api.get('/api/auth/me/');
            if (res.status === 200) {
                setUser({ 
                    roles: [res.data.role], 
                    role: res.data.role,
                    first_name: res.data.first_name,
                    username: res.data.username,
                });
            }
        } catch {
            // No valid session — user is not logged in
            setUser(null);
        }
    };

    useEffect(() => {
        const initializeAuthAndSettings = async () => {
            // 1. Fetch System Settings
            await fetchSettings();

            // 2. Check if user is logged in via cookie
            await refreshUser();
            
            setIsAppLoading(false);
        };

        initializeAuthAndSettings();
    }, []);

    const login = (userData: UserData) => {
        // Called after a successful login — the backend already set the cookies,
        // so we just update the React state with the user info from the response body.
        setUser({ 
            roles: [userData.role], 
            role: userData.role,
            first_name: userData.first_name,
            username: userData.username,
        });
    };

    const logout = async () => {
        try {
            // Tell the backend to clear the HttpOnly cookies
            await api.post('/api/auth/logout/');
        } catch {
            // Ignore errors during logout
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, settings, login, logout, refreshSettings: fetchSettings, refreshUser }}>
            {!isAppLoading ? children : <div className="flex h-screen items-center justify-center">Loading App...</div>}
        </AuthContext.Provider>
    );
};