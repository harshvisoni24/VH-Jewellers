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
      <aside className="border-b border-gold/30 bg-black/30 p-4 md:w-64 md:shrink-0 md:border-b-0 md:border-r md:p-5">
        {/* phones: logo on the left, Home on the right, menu scrolls sideways below; larger screens: a tall sidebar */}
        <div className="flex items-center justify-between gap-3 md:block">
          <Link to="/" aria-label="VH Jewellers, store home" className="block w-fit text-gold"><Logo /></Link>
          <div className="text-right md:text-left">
            <p className="eyebrow !tracking-[0.35em] md:mt-4">Admin</p>
            <Link to="/" className="btn-outline mt-2 !px-5 !py-2 md:w-full md:!py-2.5"><Home size={16} strokeWidth={1.5} />Home</Link>
          </div>
        </div>
        <div className="rule my-5 hidden md:block" />
        <nav className="mt-4 flex gap-1 overflow-x-auto pb-1 md:mt-0 md:flex-col md:pb-0">{links.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `whitespace-nowrap border-l-2 px-4 py-2 tracking-wide transition-colors ${isActive ? "border-gold bg-cream font-medium text-night" : "border-transparent text-pearl hover:bg-gold/10 hover:text-gold"}`}>{label}</NavLink>))}
          <button onClick={signOut} className="whitespace-nowrap border-l-2 border-transparent px-4 py-2 text-left tracking-wide text-pearl transition-colors hover:text-gold">Log out</button></nav>
      </aside>
      <main className="min-w-0 flex-1"><Outlet /></main>
    </div>
  );
}
