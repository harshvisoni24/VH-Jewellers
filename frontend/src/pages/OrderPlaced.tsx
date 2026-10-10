import { Link, useLocation } from "react-router-dom";
import { rupees } from "../api/client";

interface Placed { orderNumber: string; subtotalPaise: number; discountPaise: number; deliveryPaise: number; totalPaise: number; items: { name: string; quantity: number; pricePaise: number }[] }

export default function OrderPlaced() {
  const order = useLocation().state as Placed | null;
  if (!order) return (
    <div className="mx-auto max-w-xl px-5 py-12 text-center">
      <h1 className="font-display text-3xl text-emerald">Thank you for shopping with us</h1>
      <p className="mt-3">To check on an order, use <Link to="/track" className="underline">Track order</Link> with your order number and email.</p>
    </div>);
  return (
    <div className="mx-auto max-w-xl px-5 py-10">
      <h1 className="font-display text-4xl text-emerald">Order placed. Thank you!</h1>
      <p className="mt-3">Your order number is <strong className="text-xl">{order.orderNumber}</strong>. Please keep it: you'll need it, with your email, to track the order.</p>
      <ul className="mt-6 space-y-1 bg-white p-4">{order.items.map((i) => <li key={i.name} className="flex justify-between"><span>{i.name} × {i.quantity}</span><span>{rupees(i.pricePaise * i.quantity)}</span></li>)}
        <li className="flex justify-between border-t pt-2 text-sm"><span>Subtotal</span><span>{rupees(order.subtotalPaise)}</span></li>
        {order.discountPaise > 0 && <li className="flex justify-between text-sm"><span>Coupon discount</span><span>−{rupees(order.discountPaise)}</span></li>}
        <li className="flex justify-between text-sm"><span>Delivery</span><span>{order.deliveryPaise ? rupees(order.deliveryPaise) : "Free"}</span></li>
        <li className="flex justify-between text-lg"><strong>Total to pay on delivery</strong><strong>{rupees(order.totalPaise)}</strong></li></ul>
      <p className="mt-4 text-sm text-ink/70">We'll confirm your order and deliver it in 3–7 working days. Payment is cash on delivery.</p>
      <div className="mt-6 flex gap-4"><Link to={`/track?order=${encodeURIComponent(order.orderNumber)}`} className="rounded-sm bg-gold px-5 py-3 text-white">Track this order</Link><Link to="/" className="rounded-sm border border-gold px-5 py-3">Continue shopping</Link></div>
    </div>
  );
}