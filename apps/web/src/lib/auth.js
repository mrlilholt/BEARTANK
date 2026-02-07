import { useEffect, useMemo, useState } from 'react';

const ROLE_KEY = 'beartank_role';
const VALID_ROLES = ['student', 'teacher', 'super_admin'];

export const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  super_admin: 'Super Admin'
};

function getInitialRole() {
  if (typeof window === 'undefined') return 'student';
  const params = new URLSearchParams(window.location.search);
  const urlRole = params.get('role');
  if (VALID_ROLES.includes(urlRole)) {
    localStorage.setItem(ROLE_KEY, urlRole);
    return urlRole;
  }
  const stored = localStorage.getItem(ROLE_KEY);
  if (VALID_ROLES.includes(stored)) return stored;
  return 'student';
}

export function useRole() {
  const [role, setRole] = useState(getInitialRole);

  useEffect(() => {
    localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  return useMemo(() => ({ role, setRole }), [role]);
}
