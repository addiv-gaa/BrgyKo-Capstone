import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api"; // Adjust the path if your api.ts is elsewhere
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";

// Define the props for TypeScript
interface ProtectedRouteProps {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    // null means we are currently checking. true/false means check is complete.
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    useEffect(() => {
        auth().catch(() => setIsAuthorized(false));
    }, []);

    const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        
        try {
            // Replace '/api/token/refresh/' with your actual Django backend refresh endpoint
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            });
            
            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
        } catch (error) {
            console.error("Failed to refresh token:", error);
            setIsAuthorized(false);
        }
    };

    const auth = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        
        if (!token) {
            setIsAuthorized(false);
            return;
        }

        const decoded = jwtDecode(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        // If the token is expired, try to refresh it
        if (tokenExpiration && tokenExpiration < now) {
            await refreshToken();
        } else {
            // Token is still valid
            setIsAuthorized(true);
        }
    };

    // Show a loading state while checking the tokens
    if (isAuthorized === null) {
        return <div>Loading authentication...</div>; 
    }

    // If authorized, render the protected component. Otherwise, kick them to login.
    return isAuthorized ? <>{children}</> : <Navigate to="/login" replace />;
}
