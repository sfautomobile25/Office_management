import React from 'react';
import { Navigate } from 'react-router-dom';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

function hasPermission(user, perm) {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const perms = Array.isArray(user.permissions) ? user.permissions : [];

  if (Array.isArray(perm)) {
    return perm.some(p => perms.includes('all') || perms.includes(p));
  }
  return perms.includes('all') || perms.includes(perm);
}

export default function RequirePerm({ perm, children }) {
  const user = getUser();

  if (!user) return <Navigate to="/login" replace />;

  if (perm && !hasPermission(user, perm)) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Access denied</h3>
        <p>You don’t have permission to access this page.</p>
      </div>
    );
  }

  return children;
}
