import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api"; 
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

interface CustomJwtPayload {
    exp?: number;
    role?: string;   // Added: If Django sends a single role string
    roles?: string[]; // Added: If Django sends an array of roles
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    useEffect(() => {
        const refreshAuthToken = async () => {
            // FIX 1: Renamed variable to prevent shadowing the function name
            const currentRefreshToken = localStorage.getItem(REFRESH_TOKEN);
            
            // FIX 2: Ensure refresh token exists before making the API call
            if (!currentRefreshToken) {
                setIsAuthorized(false);
                return;
            }
            
            try {
                const res = await api.post("/api/token/refresh/", {
                    refresh: currentRefreshToken,
                });
                
                if (res.status === 200) {
                    const newAccessToken = res.data.access;
                    localStorage.setItem(ACCESS_TOKEN, newAccessToken);
                    
                    const decoded = jwtDecode<CustomJwtPayload>(newAccessToken);
                    
                    // FIX 3: Safely parse roles whether Django sends a string or an array
                    const rolesFromToken = decoded.roles || (decoded.role ? [decoded.role] : []);
                    setUserRoles(rolesFromToken);
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
            } catch (error) {
                console.error("Failed to refresh token:", error);
                setIsAuthorized(false);
            }
        };

        const checkAuth = async () => {
            const token = localStorage.getItem(ACCESS_TOKEN);
            
            if (!token) {
                setIsAuthorized(false);
                return;
            }

            try {
                const decoded = jwtDecode<CustomJwtPayload>(token);
                const tokenExpiration = decoded.exp;
                const now = Date.now() / 1000;

                if (tokenExpiration && tokenExpiration < now) {
                    await refreshAuthToken();
                } else {
                    // Token is valid. Safely parse roles whether string or array.
                    const rolesFromToken = decoded.roles || (decoded.role ? [decoded.role] : []);
                    setUserRoles(rolesFromToken);
                    setIsAuthorized(true);
                }
            } catch (error) {
                console.error("Failed to decode token:", error);
                setIsAuthorized(false);
            }
        };

        checkAuth().catch(() => setIsAuthorized(false));
    }, []); 

    if (isAuthorized === null) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Loading authentication...</div>; 
    }

    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.some(role => userRoles.includes(role.toUpperCase()));
        
        if (!hasPermission) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return <>{children}</>;
}