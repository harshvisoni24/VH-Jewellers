import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [["/admin", "Dashboard"], ["/admin/products", "Products"], ["/admin/products/new", "Add product"], ["/admin/orders", "Orders"], ["/admin/inventory", "Inventory"], ["/admin/customers", "Customers"], ["/admin/coupons", "Coupons"], ["/admin/categories", "Categories"], ["/admin/reviews", "Reviews"], ["/admin/questions", "Questions"], ["/admin/notifications", "Notifications"], ["/admin/settings", "Settings"]] as const;
export default function AdminLayout() {
  const { logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-emerald p-4 text-pearl md:w-56">
        <p className="font-display text-2xl">VH Admin</p>
        <nav className="mt-4 flex gap-2 md:flex-col">{links.map(([to, label]) => (
          <NavLink key={to} to={to} end className={({ isActive }) => `rounded-sm px-3 py-2 ${isActive ? "bg-gold text-white" : "hover:bg-white/10"}`}>{label}</NavLink>))}
          <button onClick={logout} className="px-3 py-2 text-left">Log out</button></nav>
      </aside>
      <main className="flex-1 overflow-x-auto"><Outlet /></main>
    </div>
  );
}
