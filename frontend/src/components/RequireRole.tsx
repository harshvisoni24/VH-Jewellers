import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, User } from "../context/AuthContext";

/** UX guard only. The API enforces the real permission check on every request. */
export default function RequireRole({ role, children }: { role: User["role"]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-10 text-center text-ink/60">Loading…</p>;
  if (!user) return <Navigate to={`/login?role=${role.toLowerCase()}`} replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}
