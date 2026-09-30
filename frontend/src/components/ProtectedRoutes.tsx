import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import api from "../api"; 

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [userRoles, setUserRoles] = useState<string[]>([]);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Call the /api/auth/me/ endpoint — the HttpOnly cookie is sent automatically.
                // If this succeeds, the user is authenticated.
                const res = await api.get('/api/auth/me/');
                
                if (res.status === 200) {
                    const role = res.data.role?.toUpperCase() || '';
                    setUserRoles(role ? [role] : []);
                    setIsAuthorized(true);
                } else {
                    setIsAuthorized(false);
                }
            } catch {
                // 401 or network error — user is not logged in.
                // The axios interceptor will attempt a refresh automatically.
                // If the refresh also fails, we end up here.
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