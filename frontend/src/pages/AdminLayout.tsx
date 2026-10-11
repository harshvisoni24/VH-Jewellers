import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home } from "lucide-react";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const links = [["/admin", "Dashboard"], ["/admin/products", "Products"], ["/admin/products/new", "Add product"], ["/admin/orders", "Orders"], ["/admin/inventory", "Inventory"], ["/admin/customers", "Customers"], ["/admin/coupons", "Coupons"], ["/admin/categories", "Categories"], ["/admin/reviews", "Reviews"], ["/admin/questions", "Questions"], ["/admin/notifications", "Notifications"], ["/admin/settings", "Settings"]] as const;
export default function AdminLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const signOut = () => { nav("/"); logout(); }; // leave the admin area first, then end the session
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-gold/30 bg-black/30 p-5 md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <Link to="/" aria-label="VH Jewellers, store home" className="block w-fit text-gold"><Logo /></Link>
        <p className="eyebrow mt-4 !tracking-[0.35em]">Admin</p>
        <Link to="/" className="btn-outline mt-4 w-full !py-2.5"><Home size={16} strokeWidth={1.5} />Home</Link>
        <div className="rule my-5" />
        <nav className="flex gap-1 overflow-x-auto md:flex-col">{links.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `whitespace-nowrap border-l-2 px-4 py-2 tracking-wide transition-colors ${isActive ? "border-gold bg-gold/10 text-gold" : "border-transparent text-pearl hover:bg-gold/5 hover:text-gold"}`}>{label}</NavLink>))}
          <button onClick={signOut} className="whitespace-nowrap border-l-2 border-transparent px-4 py-2 text-left tracking-wide text-pearl transition-colors hover:text-gold">Log out</button></nav>
      </aside>
      <main className="min-w-0 flex-1 overflow-x-auto"><Outlet /></main>
    </div>
  );
}
