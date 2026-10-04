import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

export default function Notifications({ admin = false }: { admin?: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ id: string; message: string; isRead: boolean; createdAt: string }[]>("/notifications") });
  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      {!admin && <Link to="/shop" className="text-sm underline">Back to shop</Link>}
      <div className="mt-3 flex items-center justify-between"><h1 className="font-display text-3xl text-emerald">Notifications</h1>
        <button onClick={() => api("/notifications/read-all", { method: "POST" }).then(() => qc.invalidateQueries({ queryKey: ["notifications"] }))} className="text-sm underline">Mark all as read</button></div>
      {isLoading && <p className="mt-6">Loading…</p>}
      {data && !data.length && <p className="mt-6">No notifications yet. Order updates will show up here.</p>}
      <ul className="mt-6 space-y-2">{data?.map((n) => <li key={n.id} className={`p-3 ${n.isRead ? "bg-white/60" : "bg-white font-medium"}`}>{n.message}<span className="ml-2 text-xs text-ink/50">{new Date(n.createdAt).toLocaleDateString("en-IN")}</span></li>)}</ul>
    </div>
  );
}
