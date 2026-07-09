import { useContext, type ReactNode } from 'react';
import { AuthContext } from './AuthContext';

interface RequireRoleProps {
    children: ReactNode;
    allowedRoles: string[];
}

export default function RequireRole({ children, allowedRoles }: RequireRoleProps) {
    const auth = useContext(AuthContext);

    // If not logged in, or context is missing, don't render anything
    if (!auth || !auth.user) return null;

    // Check if they have the right role
    const hasPermission = allowedRoles.some(role => auth.user!.roles.includes(role));

    // If they have permission, render the wrapped component; otherwise, render nothing
    return hasPermission ? <>{children}</> : null;
}