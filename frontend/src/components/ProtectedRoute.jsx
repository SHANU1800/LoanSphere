import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRoleAccess } from '../constants/rolePolicy';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/login" replace />;
    if (allowedRoles.length > 0 && !hasRoleAccess(user.role, allowedRoles)) {
        return <Navigate to="/access-denied" replace state={{ from: location.pathname }} />;
    }
    return children;
}
