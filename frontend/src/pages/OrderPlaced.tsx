import { Link, useLocation } from "react-router-dom";
import { rupees } from "../api/client";
import Ornament from "../components/Ornament";
import SectionTitle from "../components/SectionTitle";

interface Placed { orderNumber: string; subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number; items: { name: string; quantity: number; pricePaise: number }[] }

export default function OrderPlaced() {
  const order = useLocation().state as Placed | null;
  if (!order) return (
    <div className="grid min-h-[60vh] place-items-center px-5 text-center">
      <div className="max-w-md">
        <Ornament className="mb-6" />
        <h1 className="text-4xl sm:text-5xl">Thank you for shopping with us</h1>
        <p className="mt-4 text-ink/70">To check on an order, use Track order with your order number and email.</p>
        <Link to="/track" className="btn-outline mt-9">Track order</Link>
      </div>
    </div>);
  return (
    <div className="mx-auto max-w-xl px-5 py-12">
      <SectionTitle as="h1" eyebrow="Thank you" title="Order placed" />
      <p className="mt-8 text-center">Your order number is <strong className="font-display text-2xl font-medium text-gold">{order.orderNumber}</strong>.<br /><span className="text-sm text-ink/70">Keep it: you'll need it, with your email, to track the order.</span></p>
      <ul className="mt-8 space-y-2 bg-panel p-6">{order.items.map((i) => <li key={i.name} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{rupees(i.pricePaise * i.quantity)}</span></li>)}
        <li className="flex justify-between border-t pt-3 text-sm"><span>Subtotal</span><span>{rupees(order.subtotalPaise)}</span></li>
        {order.discountPaise > 0 && <li className="flex justify-between text-sm"><span>Coupon discount</span><span>−{rupees(order.discountPaise)}</span></li>}
        <li className="flex justify-between text-sm"><span>Delivery</span><span>{order.deliveryPaise ? rupees(order.deliveryPaise) : "Free"}</span></li>
        <li className="flex items-baseline justify-between border-t pt-3"><span className="eyebrow">Pay on delivery</span><strong className="font-display text-3xl font-medium text-gold">{rupees(order.totalPaise)}</strong></li></ul>
      <p className="mt-5 text-center text-sm text-ink/70">We'll confirm your order and deliver it in 3–7 working days.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4"><Link to={`/track?order=${encodeURIComponent(order.orderNumber)}`} className="btn-gold">Track this order</Link><Link to="/" className="btn-outline">Continue shopping</Link></div>
    </div>
  );
}
