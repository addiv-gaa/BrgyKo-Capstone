import { createContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'; 

const API_URL = import.meta.env.VITE_API_URL;

interface User {
    token: string;
    roles: string[];
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

interface AuthContextType {
    user: User | null;
    settings: SystemSettings | null;
    login: (token: string) => void;
    logout: () => void;
    refreshSettings: () => void;
    refreshUser: () => Promise<void>; // Added to TypeScript interface
}

interface CustomJwtPayload {
    exp?: number;
    roles?: string[];
    first_name?: string;
    username?: string;
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
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            try {
                const decoded = jwtDecode<CustomJwtPayload>(token);
                setUser({ 
                    roles: decoded.roles || [], 
                    token,
                    first_name: decoded.first_name,
                    username: decoded.username
                });
            } catch (error) {
                console.error("Failed to decode token on refresh", error);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        const initializeAuthAndSettings = async () => {
            // 1. Fetch System Settings
            await fetchSettings();

            // 2. Decode User Token
            await refreshUser();
            
            setIsAppLoading(false);
        };

        initializeAuthAndSettings();
    }, []);

    const login = (token: string) => {
        localStorage.setItem(ACCESS_TOKEN, token);
        const decoded = jwtDecode<CustomJwtPayload>(token);
        setUser({ 
            roles: decoded.roles || [], 
            token,
            first_name: decoded.first_name,
            username: decoded.username
        });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
    };

    return (
        <AuthContext.Provider value={{ user, settings, login, logout, refreshSettings: fetchSettings, refreshUser }}>
            {!isAppLoading ? children : <div className="flex h-screen items-center justify-center">Loading App...</div>}
        </AuthContext.Provider>
    );
};