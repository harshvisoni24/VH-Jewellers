import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { api } from "../api/client";

export interface User { id: string; name: string; email: string; role: "BUYER" | "ADMIN" }
interface Ctx { user: User | null; loading: boolean; login(email: string, password: string): Promise<User>;
  register(d: { name: string; email: string; password: string }): Promise<User>; logout(): Promise<void> }
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<User>("/auth/me").then(setUser).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const value: Ctx = {
    user, loading,
    login: async (email, password) => { const u = await api<User>("/auth/login", { method: "POST", json: { email, password } }); setUser(u); return u; },
    register: async (d) => { const u = await api<User>("/auth/register", { method: "POST", json: d }); setUser(u); return u; },
    logout: async () => { await api("/auth/logout", { method: "POST" }); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
