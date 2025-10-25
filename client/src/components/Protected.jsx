import React from "react";
import { useSelector } from "react-redux";

/**
 * role: 'admin' | 'salesman' | undefined
 * if role provided, only allow that role (or array of roles)
 * else only check authenticated.
 */
export default function Protected({ roles, children, fallback = null }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  if (!isAuthenticated) return fallback;

  if (roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!user || !allowed.includes(user.role)) return fallback;
  }
  return <>{children}</>;
}
