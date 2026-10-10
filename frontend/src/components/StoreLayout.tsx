import { Link, Outlet, useNavigate } from "react-router-dom";
import { Heart, Package, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const Badge = ({ n }: { n: number }) => n > 0 ? <span className="absolute -right-2.5 -top-2.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-gold px-1 text-xs font-medium leading-none text-white">{n}</span> : null;

/** Navigation bar shown on every storefront page (home, product, cart, …). It stays pinned to the top while scrolling. */
export default function StoreLayout() {
  const { user, loading, logout } = useAuth();
  const { count, wishlist } = useCart();
  const nav = useNavigate();
  const link = "relative flex items-center gap-1.5 hover:text-gold";
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-pearl/95 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link to="/" className="font-display text-3xl text-emerald">VH Jewellers</Link>
          <div className="ml-auto flex items-center gap-5 text-sm sm:gap-6">
            <Link to="/track" className={link}><Package size={20} /><span className="hidden sm:inline">Track order</span></Link>
            <Link to="/wishlist" className={link} aria-label={`Wishlist, ${wishlist.length} saved`}><Heart size={20} /><span className="hidden sm:inline">Wishlist</span><Badge n={wishlist.length} /></Link>
            <Link to="/cart" className={link} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}><ShoppingBag size={22} /><span className="hidden sm:inline">Cart</span><Badge n={count} /></Link>
            {user?.role === "ADMIN" && <Link to="/admin" className="rounded-sm bg-emerald px-3 py-1.5 text-white">Admin dashboard</Link>}
            {user && <button onClick={() => { logout().then(() => nav("/")); }} className="hover:text-gold">Log out</button>}
            {!user && !loading && <Link to="/login" className="rounded-sm bg-gold px-4 py-1.5 font-medium text-white">Log in</Link>}
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}