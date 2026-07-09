import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import api from "../api"; 
import { REFRESH_TOKEN, ACCESS_TOKEN } from "../constants";

// 1. Add allowedRoles to your props (make it optional in case you just want a generic login check)
interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

// 2. Define the shape of your JWT payload so TypeScript doesn't complain about 'roles'
interface CustomJwtPayload {
    exp?: number;
    roles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    // 3. Add a state to hold the user's roles once the token is validated
    const [userRoles, setUserRoles] = useState<string[]>([]);

    useEffect(() => {
        auth().catch(() => setIsAuthorized(false));
    }, []);

    const refreshToken = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        
        try {
            const res = await api.post("/api/token/refresh/", {
                refresh: refreshToken,
            });
            
            if (res.status === 200) {
                const newAccessToken = res.data.access;
                localStorage.setItem(ACCESS_TOKEN, newAccessToken);
                
                // Decode the NEW token to get the roles
                const decoded = jwtDecode<CustomJwtPayload>(newAccessToken);
                setUserRoles(decoded.roles || []);
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

        const decoded = jwtDecode<CustomJwtPayload>(token);
        const tokenExpiration = decoded.exp;
        const now = Date.now() / 1000;

        if (tokenExpiration && tokenExpiration < now) {
            await refreshToken();
        } else {
            // Token is still valid, set the roles and authorize
            setUserRoles(decoded.roles || []);
            setIsAuthorized(true);
        }
    };

    if (isAuthorized === null) {
        return <div className="flex h-screen items-center justify-center">Loading authentication...</div>; 
    }

    // Not logged in at all? Kick to login.
    if (!isAuthorized) {
        return <Navigate to="/login" replace />;
    }

    // 4. If allowedRoles is provided, check if the user has permission
    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.some(role => userRoles.includes(role));
        
        // Logged in, but wrong role? Kick to an unauthorized/403 page.
        if (!hasPermission) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // If they are authorized and pass the role check (or if no role check was required), render the page
    return <>{children}</>;
}