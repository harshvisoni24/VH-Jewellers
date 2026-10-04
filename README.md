# VH Jewellers 💎

A full-stack e-commerce platform for a jewellery store, built with **React, TypeScript, Vite, Tailwind CSS, Express, Prisma, and PostgreSQL**.

VH Jewellers supports two portals:

- **Buyer portal** — browse jewellery, search/filter products, manage a cart and wishlist, place orders, track orders, manage profile/address information, ask product questions, write reviews, and receive notifications.
- **Admin portal** — manage products, images, categories, coupons, customers, inventory, orders, reviews, questions, store settings, and sales analytics.

> **Project status:** The core e-commerce application is implemented and includes authentication, role-based access, product/catalog management, cart/wishlist, order processing, payment webhook handling, reviews, questions, coupons, inventory, analytics, notifications, invoices, and return/refund workflow support. Some production integrations and operational features are intentionally left as deployment tasks; see [Known limitations](#known-limitations).

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Buyer Features](#buyer-features)
- [Admin Features](#admin-features)
- [Authentication and Authorization](#authentication-and-authorization)
- [Product and Catalog System](#product-and-catalog-system)
- [Cart, Orders, Pricing, and Stock](#cart-orders-pricing-and-stock)
- [Payments](#payments)
- [Reviews, Questions, Coupons, and Notifications](#reviews-questions-coupons-and-notifications)
- [Database](#database)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Database Setup and Seeding](#database-setup-and-seeding)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Image Uploads](#image-uploads)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [Future Improvements](#future-improvements)
- [Demo Accounts](#demo-accounts)
- [License](#license)

---

## Features

### Customer / Buyer

- Buyer registration and login
- Secure cookie-based authentication
- Role-aware portal access
- Product catalog
- Product detail pages
- Product categories
- Product search and filtering
- Material and price filters
- Sorting and pagination
- New-arrival products
- Discount/offer products
- Best-seller products
- Recently viewed products
- Shopping cart
- Wishlist
- Product reviews and ratings
- Verified-purchase review support
- Product questions and answers
- Customer profile
- Saved delivery addresses
- Order creation
- Order history
- Order details
- Order status tracking
- Coupon application
- Delivery-fee calculation
- Payment status handling
- Notifications
- Return requests for delivered orders
- Browser-based invoice printing / PDF saving

### Admin

- Admin-only dashboard
- Sales analytics
- Revenue and order summaries
- Recent orders
- Customer management
- Product management
- Product creation and editing
- Product archiving
- Product image URL management
- Local image uploads
- Category management
- Coupon management
- Inventory monitoring
- Low-stock detection
- Order management
- Order status management
- Customer activation/deactivation
- Review moderation
- Product question management
- Store settings
- GSTIN/store information
- Delivery-fee settings
- Free-delivery threshold
- Admin notifications

---

## Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Development server and build tool |
| React Router | Client-side routing |
| Tailwind CSS | Styling |
| TanStack React Query | Server-state/data management |
| React Hook Form | Form handling |
| Zod | Validation |
| Recharts | Analytics charts |
| Lucide React | Icons |

### Backend

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express | REST API |
| TypeScript | Type safety |
| Prisma | ORM/database access |
| PostgreSQL | Relational database |
| JWT | Authentication |
| bcryptjs | Password hashing |
| Zod | Request validation |
| Multer | Image uploads |
| Helmet | HTTP security headers |
| CORS | Cross-origin configuration |
| express-rate-limit | Rate limiting |
| Vitest | Testing |
| Supertest | API testing |

---

## Project Structure

```text
vh-jewellers/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── account.ts
│   │   │   ├── adminExtras.ts
│   │   │   ├── analytics.ts
│   │   │   ├── auth.ts
│   │   │   ├── cart.ts
│   │   │   ├── misc.ts
│   │   │   ├── orders.ts
│   │   │   ├── payments.ts
│   │   │   ├── products.ts
│   │   │   ├── reviews.ts
│   │   │   └── wishlist.ts
│   │   ├── utils/
│   │   │   ├── pricing.ts
│   │   │   ├── settings.ts
│   │   │   └── pricing.test.ts
│   │   ├── app.test.ts
│   │   └── server.ts
│   │
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── .gitignore
├── README.md
└── package-lock.json
```

---

## Architecture

The application is split into two main applications:

```text
                ┌──────────────────────┐
                │      React/Vite      │
                │      Frontend        │
                │     localhost:5173   │
                └──────────┬───────────┘
                           │
                           │ REST API
                           │ cookies
                           ▼
                ┌──────────────────────┐
                │       Express        │
                │       Backend        │
                │     localhost:4000   │
                └──────────┬───────────┘
                           │
                           │ Prisma
                           ▼
                ┌──────────────────────┐
                │      PostgreSQL      │
                │       Database       │
                └──────────────────────┘

                           │
                           ▼
                ┌──────────────────────┐
                │ Payment Gateway      │
                │ webhook integration  │
                └──────────────────────┘
```

The frontend communicates with the backend through REST endpoints under `/api`.

The backend is responsible for authentication, authorization, validation, pricing, stock, orders, payments, database operations, and other business rules.

---

## Buyer Features

### Authentication

Users can:

- Register
- Log in
- Log out
- Check their current session
- Access buyer-only pages

The frontend uses the authenticated user returned by `/api/auth/me` to maintain the session state.

### Shopping

The buyer can:

1. Open the shop.
2. Browse jewellery.
3. Filter products.
4. Open a product detail page.
5. Add products to the cart.
6. Add products to the wishlist.
7. Apply an eligible coupon.
8. Enter/select a delivery address.
9. Create an order.
10. Complete the payment flow.
11. Track the order.
12. Request a return after delivery when applicable.

---

## Admin Features

Admin routes are protected on the server.

The admin dashboard provides access to:

```text
Admin
├── Dashboard
├── Products
│   ├── Product list
│   ├── Add product
│   └── Edit product
├── Orders
├── Inventory
├── Customers
├── Categories
├── Coupons
├── Reviews
├── Questions
├── Notifications
└── Settings
```

Admin analytics include sales/revenue summaries, order counts, customer counts, product counts, pending orders, low-stock products, recent orders, monthly comparisons, and sales ranges.

---

## Authentication and Authorization

Authentication uses a JWT stored in an HTTP cookie.

The backend:

1. Reads the token from the cookie.
2. Verifies the JWT signature.
3. Looks up the user in PostgreSQL.
4. Checks whether the user is active.
5. Re-reads the current role from the database.
6. Adds the authenticated user to the Express request.

Admin routes are mounted behind:

```text
requireAuth
        ↓
requireRole("ADMIN")
        ↓
admin endpoint
```

The role is intentionally read from the database on every authenticated request instead of trusting a role stored only inside the JWT.

This prevents a stale token from granting permissions after an account's role changes.

---

## Product and Catalog System

Products contain information such as:

- SKU
- Name
- Description
- Category
- Price
- Discount percentage
- Stock
- Reserved stock
- Material
- Purity
- Weight
- Size
- Color
- Brand
- Tags
- Average rating
- Review count
- Status
- Product images

Product statuses:

```text
DRAFT
ACTIVE
ARCHIVED
```

The catalog supports:

- Search
- Category filtering
- Material filtering
- Price range filtering
- Sorting
- Pagination
- Product details
- Ratings/reviews
- Product images

The home API also provides:

- New arrivals
- Offers
- Best sellers

---

## Cart, Orders, Pricing, and Stock

### Money representation

Money is stored as integer **paise**, not floating-point currency values.

For example:

```text
₹1,250.50
↓
125050 paise
```

This avoids common floating-point rounding problems.

### Product pricing

The final product price is calculated from:

```text
base price - product discount
```

The backend recalculates pricing rather than trusting prices supplied by the browser.

### Coupon pricing

Coupons support:

- Percentage discounts
- Fixed discounts
- Minimum order value
- Maximum discount
- Start/end dates
- Usage limits
- Active/inactive state

The coupon discount cannot exceed:

- the coupon's maximum discount, or
- the order subtotal.

### Order price freezing

When an order is created, the purchase price is copied into:

```text
OrderItem.priceAtPurchasePaise
```

This means changing a product's price later does not change historical orders.

### Stock reservation

When an order is created:

```text
available stock
        ↓
stock reservation
        ↓
order created
```

Reserved stock is restored when an order is cancelled.

This helps prevent overselling.

---

## Order Lifecycle

Orders support these statuses:

```text
PENDING
PAID
PROCESSING
PACKED
SHIPPED
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
RETURN_REQUESTED
RETURNED
REFUNDED
```

Payment statuses include:

```text
CREATED
AUTHORIZED
PAID
FAILED
REFUNDED
```

---

## Payments

The backend includes a payment integration boundary that can be adapted to a gateway such as Razorpay.

Payment confirmation is designed around a signed webhook.

The webhook:

1. Receives the raw request body.
2. Reads the signature header.
3. Calculates an HMAC-SHA256 signature.
4. Compares signatures using a timing-safe comparison.
5. Processes the `payment.paid` event.
6. Marks the payment as paid.
7. Marks the associated order as paid.

Webhook processing is idempotent: an already-paid payment is not processed again.

### Development payment confirmation

A development-only endpoint is available:

```text
POST /api/payments/dev-confirm
```

It is disabled when:

```text
NODE_ENV=production
```

This allows the complete order/payment flow to be tested without real payment gateway credentials.

---

## Reviews, Questions, Coupons, and Notifications

### Reviews

Customers can review products.

A review contains:

- Rating
- Title
- Comment
- Optional image URLs
- Verified-purchase flag
- User
- Product
- Creation time

Only one review per user/product combination is allowed.

When an admin removes a review, the product's average rating and review count are recalculated.

### Product questions

Customers can ask questions about products.

Admins can answer questions from the admin portal.

### Coupons

Admins can create and activate/deactivate coupons.

Example:

```text
WELCOME10
10% off
Minimum order: ₹5,000
Maximum discount: ₹10,000
```

### Notifications

Notifications are stored per user and support:

- Message
- Type
- Read/unread state
- Creation time

Users can mark all notifications as read.

---

## Database

The application uses PostgreSQL through Prisma.

Main models include:

```text
User
Category
Product
ProductImage
Cart
CartItem
Wishlist
WishlistItem
Address
Order
OrderItem
Payment
Review
Coupon
CouponUsage
Notification
Question
Setting
```

Important relationships include:

```text
User
 ├── Cart
 ├── Wishlist
 ├── Addresses
 ├── Orders
 ├── Reviews
 ├── Notifications
 ├── CouponUsages
 └── Questions

Product
 ├── Category
 ├── Images
 ├── Reviews
 ├── CartItems
 ├── WishlistItems
 ├── OrderItems
 └── Questions

Order
 ├── User
 ├── Address
 ├── OrderItems
 ├── Payments
 └── Coupon
```

Prisma migrations are stored in:

```text
backend/prisma/migrations/
```

---

## Environment Variables

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

Example:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vh_jewellers

JWT_SECRET=replace-with-a-long-random-secret

PAYMENT_SECRET=
PAYMENT_WEBHOOK_SECRET=

IMAGE_STORAGE_URL=
IMAGE_STORAGE_KEY=
IMAGE_STORAGE_SECRET=

CLIENT_URL=http://localhost:5173

NODE_ENV=development
SERVER_URL=http://localhost:4000
```

### Variable descriptions

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `PAYMENT_SECRET` | Payment gateway secret |
| `PAYMENT_WEBHOOK_SECRET` | Secret used to verify payment webhooks |
| `IMAGE_STORAGE_URL` | Production image-storage URL |
| `IMAGE_STORAGE_KEY` | Production image-storage credential |
| `IMAGE_STORAGE_SECRET` | Production image-storage secret |
| `CLIENT_URL` | Frontend URL allowed by CORS |
| `NODE_ENV` | Environment name |
| `SERVER_URL` | Backend server URL |

> **Never commit `.env` to GitHub.** Only commit `.env.example`.

---

## Local Development Setup

### Requirements

Install:

- Node.js
- npm
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone https://github.com/harshvisoni24/vh-jewellers.git
cd vh-jewellers
```

### 2. Configure the backend

```bash
cd backend
```

Create `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell, you can also copy the file manually.

Set at least:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vh_jewellers
JWT_SECRET=your-long-random-secret
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:4000
NODE_ENV=development
```

### 3. Install backend dependencies

```bash
npm install
```

### 4. Generate/apply the database

```bash
npx prisma migrate dev
```

### 5. Seed demo data

```bash
npm run db:seed
```

### 6. Start the backend

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:4000
```

### 7. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

---

## Database Setup and Seeding

The seed script creates:

- One admin account
- Three buyer accounts
- Jewellery categories
- Sample products
- Sample images
- A sample address
- Historical/demo orders
- A `WELCOME10` coupon

Run:

```bash
cd backend
npm run db:seed
```

The seed data is for development/demo purposes.

**Do not use the demo credentials or demo seed as production credentials/data.**

---

## Available Scripts

### Backend

From `backend/`:

```bash
npm run dev
```

Starts the backend in watch mode.

```bash
npm run build
```

Compiles TypeScript.

```bash
npm run db:migrate
```

Creates/applies a Prisma development migration.

```bash
npm run db:seed
```

Seeds demo data.

```bash
npm test
```

Runs the test suite with Vitest.

### Frontend

From `frontend/`:

```bash
npm run dev
```

Starts the Vite development server.

```bash
npm run build
```

Runs TypeScript compilation and creates the production Vite build.

---

## API Overview

The API is rooted at:

```text
/api
```

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Products

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id
```

Product listing supports query parameters such as:

```text
q
category
material
minPrice
maxPrice
sort
page
```

### Categories

```text
GET /api/categories
```

### Home data

```text
GET /api/home
GET /api/recent
```

### Cart

```text
/api/cart/*
```

### Wishlist

```text
/api/wishlist/*
```

### Account

```text
/api/account/*
```

### Orders

```text
/api/orders/*
```

### Payments

```text
POST /api/payments/webhook
POST /api/payments/dev-confirm
```

### Notifications

```text
GET  /api/notifications
POST /api/notifications/read-all
```

### Admin

All admin endpoints require an authenticated `ADMIN` user.

```text
/api/admin/*
```

Admin functionality includes:

```text
/api/admin/analytics/*
/api/admin/orders/*
/api/admin/products/*
/api/admin/customers/*
/api/admin/inventory
/api/admin/categories/*
/api/admin/coupons/*
/api/admin/reviews/*
/api/admin/questions/*
/api/admin/settings
```

---

## Image Uploads

Admin users can add product images by:

1. Providing an image URL, or
2. Uploading a JPG, PNG, or WebP image.

Local uploads are stored in:

```text
backend/uploads/
```

The backend serves them through:

```text
/uploads/*
```

Upload restrictions:

```text
JPG / JPEG
PNG
WebP
Maximum size: 5 MB
```

For production, cloud/object storage should be used instead of relying on local server storage.

---

## Testing

Backend tests are run with:

```bash
cd backend
npm test
```

The project includes unit tests for pricing and coupon calculations and additional API/database test infrastructure.

For database-dependent testing, use a separate throwaway PostgreSQL database rather than your development or production database.

Example workflow:

```bash
createdb vh_test
```

Then apply migrations to the test database and provide:

```text
TEST_DATABASE_URL
```

The database tests cover important business rules such as:

- Role access
- Buyer/admin authorization
- Stock reduction
- Price freezing
- Order behavior

---

## Production Deployment

A typical production architecture is:

```text
Frontend static host
        │
        │ /api
        ▼
Express backend
        │
        ▼
Managed PostgreSQL

Payment Gateway
        │
        │ signed webhook
        ▼
Express backend
```

### Backend

1. Create a managed PostgreSQL database.
2. Set a production `DATABASE_URL`.
3. Set a strong random `JWT_SECRET`.
4. Set `NODE_ENV=production`.
5. Set `CLIENT_URL` to the production frontend URL.
6. Configure payment secrets.
7. Configure production image storage.
8. Apply migrations:

```bash
npx prisma migrate deploy
```

9. Build:

```bash
npm run build
```

10. Start the compiled server:

```bash
node dist/src/server.js
```

### Frontend

Build:

```bash
npm run build
```

The generated:

```text
frontend/dist/
```

can be served by a static hosting provider.

The production setup should route `/api` requests to the backend and preserve cookie behavior.

### Production database

Do **not** run the demo seed against your production database.

Create your own production admin account and production data.

---

## Security

The application includes several security measures:

- Password hashing with bcrypt
- JWT authentication
- HTTP-only cookie-based session mechanism
- Database-backed role verification
- Admin-only server-side authorization
- Helmet security headers
- CORS configuration
- Authentication rate limiting
- Zod request validation
- HMAC-SHA256 payment webhook verification
- Timing-safe webhook signature comparison
- Server-side price recalculation
- Server-side coupon validation
- Server-side stock handling
- Sensitive password hashes excluded from customer management queries

### Important production rules

Never commit:

```text
.env
API keys
JWT secrets
Payment secrets
Database passwords
Cloud-storage secrets
```

Use environment variables or a secure secret manager.

---

## Known Limitations

The following areas still require production integration or further development:

- Admin refund status is recorded in the application, but the actual payment refund must currently be performed through the payment gateway/dashboard.
- Payment webhook payload handling needs to be adapted to the exact gateway being used.
- Production image storage should use cloud/object storage instead of local disk.
- Email/SMS notifications are not implemented.
- Full-text search is not implemented.
- Automated low-stock notifications are not implemented.
- Production observability/logging and monitoring should be added.
- Production deployment should use a managed database, secure secrets, HTTPS, backups, and appropriate infrastructure.

---

## Future Improvements

Potential next steps include:

- Razorpay/Stripe production integration
- Automatic refunds
- Email order confirmations
- SMS/WhatsApp notifications
- Cloud image storage
- Full-text product search
- Advanced filtering
- Wishlist sharing
- Product recommendations
- Abandoned-cart recovery
- Stock alerts
- Customer analytics
- Sales reports/export
- GST invoice generation
- Delivery/shipping provider integration
- Automated deployment with CI/CD
- Error monitoring and application observability
- Automated end-to-end tests

---

## Demo Accounts

The development seed creates the following accounts.

### Admin

```text
Email: admin@vhjewellers.test
Password: Admin@12345
Role: ADMIN
```

### Buyer

```text
Email: asha@example.test
Password: Buyer@12345
Role: BUYER
```

Additional demo buyers are also created by the seed script.

> **Security warning:** These credentials are for local development/demo use only. Never use them in production.

---

## Development Workflow

A typical development workflow is:

```text
1. Start PostgreSQL
        ↓
2. Start backend
        ↓
3. Start frontend
        ↓
4. Develop/test features
        ↓
5. Run backend tests
        ↓
6. Build frontend/backend
        ↓
7. Commit changes
        ↓
8. Push to GitHub
```

Useful Git commands:

```bash
git status
git add .
git commit -m "Describe your change"
git push
```

---

## Project Goals

VH Jewellers is designed as a realistic full-stack jewellery-commerce application rather than a simple product catalogue.

The project focuses on:

- Clean separation between frontend and backend
- Strong server-side business rules
- Secure authentication and authorization
- Reliable money calculations
- Transactional order creation
- Stock reservation
- Historical price preservation
- Admin operational tools
- PostgreSQL-backed data modeling
- Extensible payment integration
- Maintainable TypeScript code

---

## License

This project does not currently specify an open-source license.

If you intend to make the repository open source, add an appropriate license such as MIT after deciding how you want the code to be used.

---

## Author

**VH Jewellers**

Repository:

```text
https://github.com/harshvisoni24/vh-jewellers
```
