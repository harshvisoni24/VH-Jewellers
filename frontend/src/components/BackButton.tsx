import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/** Round back-arrow: returns to the page the shopper came from, or to the home page if there is no earlier page. */
export default function BackButton({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <button type="button" onClick={() => (loc.key !== "default" ? nav(-1) : nav("/"))} aria-label="Go back" title="Back"
      className={`group grid h-11 w-11 place-items-center rounded-full border border-gold/50 text-gold transition hover:border-gold hover:bg-gold/10 ${className}`}>
      <ArrowLeft size={20} strokeWidth={1.5} className="transition-transform group-hover:-translate-x-0.5" />
    </button>
  );
}
