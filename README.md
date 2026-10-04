Admin: admin@vhjewellers.test / Admin@12345..
Buyer: asha@example.test / Buyer@12345

# VH Jewellers

Full-stack jewellery store (React + Vite + Tailwind, Express, Prisma, PostgreSQL).

**Done so far:** Phase 1 scaffold, full Prisma schema, auth (register/login/logout/me), role-based middleware, role-selection landing page.

## Run
```
cd backend && cp .env.example .env   # set DATABASE_URL and a 32+ char JWT_SECRET
npm install && npx prisma migrate dev --name init && npm run dev
cd ../frontend && npm install && npm run dev
```
Money is stored as integer paise. `OrderItem.priceAtPurchasePaise` freezes the price at purchase.

## Seed and demo logins
`cd backend && npm run db:seed`
- Admin: admin@vhjewellers.test / Admin@12345 (use the Admin card on the first page)
- Buyer: asha@example.test / Buyer@12345
Demo data only. Never use these in production.

## API so far
Auth: POST /api/auth/register|login|logout, GET /api/auth/me
Products: GET /api/products (q, category, material, minPrice, maxPrice, sort, page), GET /:id; admin-only POST/PATCH/DELETE
Admin: GET /api/admin/analytics/sales?range=today|7d|30d|3m|6m|1y|custom (real PostgreSQL data)

## Orders and payments
- `POST /api/orders` recalculates prices, discounts, delivery, coupon and stock on the server, inside one transaction. Prices are frozen on `OrderItem.priceAtPurchasePaise`.
- Orders start as PENDING and become PAID only when `POST /api/payments/webhook` receives a correctly signed `payment.paid` event (HMAC-SHA256 with `PAYMENT_WEBHOOK_SECRET`). Adapt the payload to your gateway (e.g. Razorpay).
- In development, `/api/payments/dev-confirm` simulates the gateway so you can test the full flow. It is disabled when `NODE_ENV=production`.
- Stock is reserved (decreased) when the order is created and restored if the order is cancelled.

## Deployment (outline)
1. Create a managed PostgreSQL database and set `DATABASE_URL`.
2. Backend: set every variable from `.env.example` (`NODE_ENV=production`, a long random `JWT_SECRET`, `CLIENT_URL` = your site URL), run `npx prisma migrate deploy`, then `npm run build && node dist/src/server.js`.
3. Frontend: `npm run build`, serve `dist/` from a static host, and route `/api` to the backend on the same domain (so the login cookie works).
4. Create your own admin account in production; do not run the demo seed there.
5. Payments: create your gateway account, then set `PAYMENT_SECRET` and `PAYMENT_WEBHOOK_SECRET` and point the gateway's webhook to `/api/payments/webhook`.

## Tests
- `cd backend && npm test` runs the pricing and coupon unit tests.
- Database tests (role access, buyer blocked from the admin door, stock reduction, and the price-freeze rule) run when `TEST_DATABASE_URL` is set to a throwaway PostgreSQL database:
  `createdb vh_test && DATABASE_URL=postgresql://.../vh_test npx prisma migrate deploy && TEST_DATABASE_URL=postgresql://.../vh_test npm test`

## Uploads, returns, invoices, settings
- Admin product edit page: upload JPG/PNG/WebP (max 5 MB) or paste a URL. Uploads go to `backend/uploads` and are served at `/uploads`. For production, replace this with your cloud storage (`IMAGE_STORAGE_*`) and back up or mount that folder if you keep local storage.
- After pulling these changes run `npx prisma migrate dev --name questions_settings` (adds Question and Setting tables).
- Buyers can request a return on delivered orders. Admin sets RETURNED (stock returns) then REFUNDED (payment marked refunded). The actual money refund must be issued from your payment gateway dashboard.
- Invoices open from My orders and print or save as PDF from the browser. Store name, GSTIN, address and delivery fees come from Admin > Settings.

## Known gaps
- Admin refunds are recorded but not sent to the payment gateway automatically.
- Low-stock admin notifications, full-text search and email/SMS notifications are not built.
