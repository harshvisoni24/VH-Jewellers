import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Amazon-style gate: guests can browse freely, but any action that needs an account
 * (add to cart, wishlist, review, question) sends them to login and brings them back afterwards.
 * Usage: const requireLogin = useRequireLogin(); requireLogin(() => doSomething());
 */
export function useRequireLogin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  return (action: () => void) => {
    if (user) return action();
    nav(`/login?redirect=${encodeURIComponent(loc.pathname + loc.search)}`);
  };
}

/** Only allow same-site relative paths, so the redirect parameter can't be used for open-redirect attacks. */
export const safeRedirect = (r: string | null) => (r && r.startsWith("/") && !r.startsWith("//") ? r : null);
