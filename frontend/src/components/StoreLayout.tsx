import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import Logo from "./Logo";

const Badge = ({ n }: { n: number }) => n > 0 ? <span className="absolute -right-2.5 -top-2 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-gold px-1 text-[11px] font-semibold leading-none text-night !tracking-normal">{n}</span> : null;
const word = ({ isActive }: { isActive: boolean }) => `relative py-2 text-[1.02rem] tracking-[0.05em] transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:transition-colors ${isActive ? "text-gold after:bg-gold" : "text-pearl after:bg-transparent hover:text-gold"}`;
const icon = ({ isActive }: { isActive: boolean }) => `relative p-1.5 transition-colors ${isActive ? "text-gold" : "text-pearl hover:text-gold"}`;

/** Navigation bar shown on every storefront page (home, product, cart, …). It stays pinned to the top while scrolling. */
export default function StoreLayout() {
  const { user, loading, logout } = useAuth();
  const { count, wishlist } = useCart();
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-night/95 backdrop-blur">
        <nav aria-label="Main" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link to="/" aria-label="VH Jewellers, home" className="justify-self-start text-gold"><Logo /></Link>
          <div className="order-3 flex w-full justify-center gap-9 md:order-none md:w-auto">
            <NavLink to="/" end className={word}>Home</NavLink>
            <NavLink to="/track" className={word}>Track order</NavLink>
          </div>
          <div className="flex items-center gap-5 justify-self-end">
            <NavLink to="/wishlist" className={icon} aria-label={`Wishlist, ${wishlist.length} saved`} title="Wishlist"><Heart size={23} strokeWidth={1.4} /><Badge n={wishlist.length} /></NavLink>
            <NavLink to="/cart" className={icon} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} title="Cart"><ShoppingBag size={23} strokeWidth={1.4} /><Badge n={count} /></NavLink>
            {user?.role === "ADMIN" && <Link to="/admin" className="btn-outline !px-4 !py-2">Admin</Link>}
            {user && <button onClick={() => { logout().then(() => nav("/")); }} className="eyebrow !tracking-[0.2em] text-pearl hover:!text-gold">Log out</button>}
            {!user && !loading && <Link to="/login" className="btn-outline !px-4 !py-2">Log in</Link>}
          </div>
        </nav>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="mt-24 border-t border-gold/30 bg-black/25">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 text-gold md:grid-cols-[1.4fr_1fr]">
          <div><Logo /><p className="mt-5 max-w-xs text-sm leading-relaxed text-ink/70">Fine gold, silver and platinum jewellery, made to be treasured.</p></div>
          <div><p className="eyebrow">Quick links</p>
            <ul className="mt-4 space-y-2 text-ink">{[["/", "Home"], ["/track", "Track order"], ["/wishlist", "Wishlist"], ["/cart", "Cart"]].map(([to, label]) => <li key={to}><Link to={to} className="transition-colors hover:text-gold">{label}</Link></li>)}</ul></div>
        </div>
        <div className="mx-auto max-w-6xl px-5 pb-8">
          <div className="flex items-center gap-3" aria-hidden="true"><span className="rule flex-1" /><span className="h-1.5 w-1.5 rotate-45 bg-gold" /><span className="rule flex-1" /></div>
          <p className="mt-5 text-center text-xs tracking-wide text-ink/60">© {new Date().getFullYear()} VH Jewellers. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
