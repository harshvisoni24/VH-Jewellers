import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Anyone can browse the store. Cart, wishlist, reviews and questions need a buyer account:
 * logged-out visitors are sent to the login page and come back to the same page afterwards.
 */
export function useBuyerGuard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return (run: () => void) => {
    if (!user) { nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`); return; }
    if (user.role !== "BUYER") { alert("Admin accounts can't shop. Log in with a buyer account to use the cart and wishlist."); return; }
    run();
  };
}
