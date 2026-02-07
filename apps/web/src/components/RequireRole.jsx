import { Navigate } from 'react-router-dom';
import { DASHBOARD_BY_ROLE } from '../lib/auth-context.jsx';
import { useAuth } from '../lib/auth-context.jsx';

export default function RequireRole({ allow, children }) {
  const { role } = useAuth();

  if (!allow.includes(role)) {
    const fallback = DASHBOARD_BY_ROLE[role] || '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
