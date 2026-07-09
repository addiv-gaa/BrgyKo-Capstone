import { createContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'; // Adjust path if needed

// 1. Define the shape of your User and Context
interface User {
    token: string;
    roles: string[];
}

interface AuthContextType {
    user: User | null;
    login: (token: string) => void;
    logout: () => void;
}

interface CustomJwtPayload {
    exp?: number;
    roles?: string[];
}

// 2. Create the Context
export const AuthContext = createContext<AuthContextType | null>(null);

// 3. Create the Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    // Add a loading state so we don't render the app before checking storage
    const [isAppLoading, setIsAppLoading] = useState(true);

    // THIS IS THE MAGIC FIX: When the app starts, check localStorage immediately!
    useEffect(() => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            try {
                const decoded = jwtDecode<CustomJwtPayload>(token);
                // Hydrate the global state with the user's roles
                setUser({ roles: decoded.roles || [], token });
            } catch (error) {
                console.error("Failed to decode token on load", error);
            }
        }
        setIsAppLoading(false);
    }, []);

    const login = (token: string) => {
        const decoded = jwtDecode<CustomJwtPayload>(token);
        setUser({ roles: decoded.roles || [], token });
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(ACCESS_TOKEN);
        localStorage.removeItem(REFRESH_TOKEN);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {/* Wait until we've checked localStorage before rendering the Sidebar and Routes */}
            {!isAppLoading ? children : <div className="flex h-screen items-center justify-center">Loading App...</div>}
        </AuthContext.Provider>
    );
};