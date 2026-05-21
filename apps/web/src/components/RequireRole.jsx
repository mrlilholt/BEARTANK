import { Navigate, useLocation } from 'react-router-dom';
import { DASHBOARD_BY_ROLE } from '../lib/auth-context.jsx';
import { useAuth } from '../lib/auth-context.jsx';
import { PATHS } from '../lib/paths.js';

export default function RequireRole({ allow, children }) {
  const location = useLocation();
  const { role } = useAuth();

  if (!allow.includes(role)) {
    if (role) {
      return (
        <Navigate
          to={PATHS.unauthorized}
          state={{ from: location.pathname, allow }}
          replace
        />
      );
    }

    const fallback = DASHBOARD_BY_ROLE[role] || PATHS.home;
    return <Navigate to={fallback} replace />;
  }

  return children;
}
