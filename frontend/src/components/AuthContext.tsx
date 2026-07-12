import { createContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'; 

// 1. UPDATED: Added first_name and username to the global User object definition
interface User {
    token: string;
    roles: string[];
    first_name?: string;
    username?: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
}

// UPDATED: Added fields to the JWT definition so jwtDecode knows they exist inside the token
interface CustomJwtPayload {
    exp?: number;
    roles?: string[];
    first_name?: string;
    username?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAppLoading, setIsAppLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            try {
                const decoded = jwtDecode<CustomJwtPayload>(token);
                // UPDATED: Extracted fields from decoded token into your application state
                setUser({ 
                    roles: decoded.roles || [], 
                    token,
                    first_name: decoded.first_name,
                    username: decoded.username
                });
            } catch (error) {
                console.error("Failed to decode token on load", error);
            }
        }
        setIsAppLoading(false);
    }, []);

    const login = (token: string) => {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        // UPDATED: Handled the payload details inside the active login handler
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
        <AuthContext.Provider value={{ user, login, logout }}>
            {!isAppLoading ? children : <div className="flex h-screen items-center justify-center">Loading App...</div>}
        </AuthContext.Provider>
    );
};