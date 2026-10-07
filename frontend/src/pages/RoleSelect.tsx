import { Link } from "react-router-dom";
import { ShieldCheck, ShoppingBag } from "lucide-react";

export default function RoleSelect() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12">
      <h1 className="font-display text-5xl sm:text-6xl font-semibold tracking-wide text-emerald">VH Jewellers</h1>
      <p className="mt-3 text-ink/60">Choose how you'd like to continue.</p>

      <div className="mt-12 grid w-full max-w-3xl gap-6 md:grid-cols-2">
        <section className="flex flex-col rounded-sm border border-gold/40 bg-white p-8">
          <ShoppingBag className="text-gold" size={28} />
          <h2 className="mt-5 font-display text-3xl text-emerald">Buyer</h2>
          <p className="mt-2 flex-1 text-ink/70">Browse jewellery, save favourites, place orders and track delivery.</p>
          <Link to="/login?role=buyer" className="mt-8 rounded-sm bg-gold px-5 py-3 text-center font-medium text-white hover:bg-gold/90">Log in as buyer</Link>
          <Link to="/register" className="mt-3 text-center text-sm text-emerald underline underline-offset-4">Create a buyer account</Link>
        </section>

        <section className="flex flex-col rounded-sm bg-emerald p-8 text-pearl">
          <ShieldCheck className="text-gold" size={28} />
          <h2 className="mt-5 font-display text-3xl">Admin</h2>
          <p className="mt-2 flex-1 text-pearl/70">Manage products, stock, orders and sales for the store.</p>
          <Link to="/login?role=admin" className="mt-8 rounded-sm border border-gold px-5 py-3 text-center font-medium text-gold hover:bg-gold hover:text-emerald">Log in as admin</Link>
          <p className="mt-3 text-center text-sm text-pearl/50">Admin accounts are created by the store owner.</p>
        </section>
      </div>
    </main>
  );
}
