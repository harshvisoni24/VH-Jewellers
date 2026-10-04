import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, User } from "../context/AuthContext";

/** UX guard only. The API enforces the real permission check on every request. */
export default function RequireRole({ role, children }: { role: User["role"]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <p className="p-10 text-center text-ink/60">Loading…</p>;
  if (!user) {
    // Sellers/admins always use their own sign-in page; buyers are sent back to where they were after login.
    return role === "ADMIN"
      ? <Navigate to="/seller/login" replace />
      : <Navigate to={`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (user.role !== role) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/"} replace />;
  return <>{children}</>;
}
