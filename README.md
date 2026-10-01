# RUVIO — production e-commerce platform

A complete, real-business-ready e-commerce system: storefront, customer accounts, admin
panel, order lifecycle, courier integration, fraud protection, marketing automation and
performance/security hardening.

Built with **Next.js 14 (App Router) · React 18 · TypeScript · Prisma 5 · PostgreSQL**.
No CSS framework — the design system in `app/globals.css` is hand-written.

---

## 1. Quick start (local)

```bash
# 1. install dependencies
npm install

# 2. configure environment
cp .env.example .env
# then edit .env (see section 3)

# 3. run (starts PostgreSQL, syncs the schema, seeds demo data, starts Next.js)
npm run dev
```

`npm run dev` does all of the following automatically:

1. boots an **embedded PostgreSQL** on `127.0.0.1:5432` (no system install needed),
2. runs `prisma db push` against `prisma/schema.prisma`,
3. runs `prisma/seed.ts` (idempotent — safe to re-run),
4. starts `next dev` on `http://localhost:3000`.

Open <http://localhost:3000>.

### Seeded credentials

| Role | Login | Password source |
| --- | --- | --- |
| Admin | `ADMIN_EMAIL` (default `mdmunna26260@gmail.com`) | `ADMIN_PASSWORD` (default `KissmeBabu64`) |
| Customer | `01712345678` | `Customer123` (`DEMO_CUSTOMER_PASSWORD`) |

All credentials come from environment variables — nothing is hardcoded in application code.
**Change them before going live** (see section 3).

### Useful scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | local development (DB + seed + Next.js) |
| `npm run build` | production build (`prisma generate` + `next build`) |
| `npm start` | production server on port 3000 |
| `npm run typecheck` | TypeScript strict check |
| `npm run db:up` / `db:down` | start/stop embedded PostgreSQL |
| `npm run db:push` | sync schema without migrations |
| `npm run db:migrate` | create a development migration |
| `npm run db:deploy` | apply migrations (production) |
| `npm run db:seed` | seed/reseed data (idempotent — safe to re-run) |
| `npm run db:query` | run a one-off SQL query against the database |
| `npm run db:studio` | Prisma Studio |

---

## 2. What is implemented

### Storefront (customer side)

| Feature | Where |
| --- | --- |
| Premium responsive homepage | `app/(shop)/page.tsx` |
| Shop with search, filters (brand/size/colour/price), sorting, infinite scroll | `app/(shop)/shop/page.tsx`, `components/ShopBrowser.tsx`, `app/api/products/route.ts` |
| Categories & subcategories | `app/(shop)/category/[slug]/page.tsx` |
| Product details: variants (size), sibling colour families, gallery, combo banner, reviews | `app/(shop)/product/[slug]/page.tsx`, `components/ProductPurchase.tsx` |
| Combo / bundle offers (“buy 2–3 items, get 1 free”) | `lib/cart.ts` (`syncComboGifts`) |
| Cart (persistent per cookie + account merge), coupon application | `app/(shop)/cart/page.tsx`, `app/api/cart/*` |
| Checkout with COD / bKash / Nagad, saved addresses, validation | `app/(shop)/checkout/page.tsx`, `app/api/orders/route.ts` |
| Order tracking (phone or signed HMAC link) | `app/(shop)/order/[orderNumber]/page.tsx` |
| Customer account: phone login, register, profile, password, addresses, order history, wishlist, reviews | `app/(shop)/account/page.tsx`, `app/api/account/*`, `app/api/auth/customer/*` |
| Reviews & ratings (verified-purchase detection, approval workflow) | `components/ReviewSection.tsx`, `app/api/reviews/route.ts` |
| SEO: metadata, `sitemap.xml`, `robots.txt` | `app/sitemap.ts`, `app/robots.ts` |

### Admin panel (`/admin`)

Dashboard · Orders (full lifecycle) · Products (CRUD, images, variants, stock, position,
featured, homepage selection) · Categories (with image upload) · Customers (block, blacklist,
history) · Inventory · Coupons & discounts · Reviews (approve/reply) · Marketing (abandoned
cart recovery with customer + item details) · Courier (Steadfast) · Fraud & blacklist ·
Settings · Admin users with role-based permissions.

Every admin action is guarded by permission checks (`lib/auth.ts`) and written to an
`AuditLog`.

### Order lifecycle

```
PENDING → CONFIRMED → PROCESSING → PARCEL_CREATED → RIDER_ASSIGNED → DELIVERED
                                                          ↘ CANCELLED / RETURNED
```

Transitions are validated against `ORDER_STATUS_FLOW` (`lib/orders.ts`), recorded in
`OrderStatusHistory`, and each transition triggers the matching customer email and a
server-side conversion event. Cancelling/returning an order restocks inventory and
releases the coupon.

### Steadfast courier

`lib/couriers/steadfast.ts` + `lib/couriers/parcel-service.ts`:

* auto parcel creation when an order is confirmed (configurable in settings),
* manual creation from any order page,
* duplicate parcel protection (unique `Parcel.orderId` + explicit guard),
* status polling (`status_by_cid` / `status_by_invoice`) with rider details,
* delivery-status **webhook** (`POST /api/webhooks/steadfast`) with HMAC signature
  verification that mirrors courier status back onto the order,
* balance endpoint used by the admin “test connection” button,
* API failure handling: errors are stored on the parcel (`syncError`) and surfaced in admin.

> **API limitation:** Steadfast does not expose a public “assign rider” endpoint. Rider
> name/phone are captured from the status webhook and status polling and then mirrored onto
> the order (`RIDER_ASSIGNED`).

### Fraud protection

`lib/fraud.ts` runs six signals per order and stores every result in `FraudCheck`:

1. local blacklist (phone, email, IP, customer, device, address keyword),
2. customer cancellation/return history,
3. Steadfast fraud check (`fraud_check/{phone}`) when API keys are configured,
4. external fraud provider (`FRAUD_API_URL`) when configured,
5. order velocity per phone + IP per hour,
6. heuristics (very large first order, high item count, high value without email).

A `BLOCK` verdict refuses the order at checkout with a clear message; `REVIEW` flags the
order in admin. Blacklist severity can be `WARN`, `REVIEW` or `BLOCK` and is fully
manageable from `/admin/fraud`.

### Marketing & tracking

* Meta Pixel, GA4 and GTM snippets loaded from settings (IDs configurable in admin).
* **Server-side Meta Conversions API** with browser/server **event deduplication**
  (`lib/tracking.ts`): the browser sends the same `event_id` it used for the Pixel, the
  server stores it (`TrackingEvent.eventId` is unique) and refuses to forward duplicates.
* Events: `ViewContent`, `AddToCart`, `AddPromotion`, `InitiateCheckout`, `Purchase`.
* GA4 Measurement Protocol forwarding (set `GA4_API_SECRET`).
* UTM capture on every order, acquisition report in `/admin/marketing`.
* Abandoned-cart recovery emails with customer + item details (`lib/orders.ts`,
  `components/admin/RecoverButton.tsx`).
* Full email log per order in admin (`NotificationLog`).

### Email automation (Gmail SMTP)

`lib/mailer.ts` + `lib/emails.ts` — professional HTML templates for: order confirmation,
invoice, parcel created, rider assigned, delivered, review request, cancelled, welcome and
abandoned cart. Every send is recorded with status (`SENT` / `FAILED` / `SKIPPED_NO_SMTP`).

### Performance

* Sharp pipeline (`lib/images.ts`): every upload becomes responsive **WebP** derivatives
  (400/800/1200/1600) + a tiny base64 placeholder, stored under `/public/uploads`.
* `<img srcset sizes>` everywhere (no client-side image library), lazy loading,
  `fetchPriority` for the hero, `decoding="async"`.
* Route-level `revalidate`, DB-backed caching for settings (30s TTL), minimal client JS,
  CDN-friendly immutable cache headers for `/uploads/*`.
* Mobile-first CSS from 320px to 4K, skeleton loading states, reduced-motion support.

### Security

* bcrypt (cost 12) password hashing; HMAC-SHA256 signed, expiring session tokens
  (`lib/crypto.ts`); opaque session values stored hashed in the database.
* Account lockout after 8 failed logins / 15 min, rate limiting on login, register, orders,
  cart, coupon, tracking, admin login (DB-backed so it works across instances).
* Brute-force protection, no user enumeration (identical error messages for unknown phone
  and wrong password).
* RBAC with per-route permission checks, admin session invalidation on role/block changes.
* Zod validation on every API route, parameterised Prisma queries (SQL-injection safe),
  HTML-escaped email content (XSS safe), CSRF-safe cookie handling (`sameSite=lax`,
  `httpOnly`, `secure` in production).
* Security headers (`next.config.mjs` + `middleware.ts`), no secrets in the client bundle,
  audit logging of every admin action.

---

## 3. Environment variables

Copy `.env.example` to `.env`. Everything secret lives here — never in code.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | e.g. `postgresql://user:pass@host:5432/db?schema=public` |
| `AUTH_SECRET` | yes | 32+ byte random string (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`) |
| `NEXT_PUBLIC_SITE_URL` | yes | canonical URL used in emails, tracking and coupons |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | yes | owner account created by the seed |
| `DEMO_CUSTOMER_PHONE` / `DEMO_CUSTOMER_PASSWORD` | optional | demo customer for testing |
| `STEADFAST_API_KEY` / `STEADFAST_SECRET_KEY` / `STEADFAST_BASE_URL` | optional | courier integration |
| `FRAUD_API_URL` / `FRAUD_API_KEY` / `FRAUDBD_API_KEY` | optional | extra fraud providers |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | optional | Gmail SMTP (use an App Password) |
| `NEXT_PUBLIC_META_PIXEL_ID` | optional | Meta Pixel |
| `META_CONVERSIONS_API_TOKEN` / `META_TEST_EVENT_CODE` | optional | server-side conversions |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID` / `GA4_API_SECRET` | optional | GA4 + server-side |
| `NEXT_PUBLIC_GTM_ID` | optional | Google Tag Manager |
| `SMS_API_URL` / `SMS_API_KEY` / `SMS_SENDER_ID` | optional | SMS OTP provider |

Meta Pixel / GA4 / GTM IDs can also be set from **Admin → Settings**, which overrides the
environment values.

---

## 4. Production deployment (VPS / Dokploy)

```bash
# on the server
git clone <repo> && cd trending-s-
cp .env.example .env      # fill in production values
npm install
npm run build             # prisma generate + next build
npm run db:deploy         # applies prisma/migrations (see note)
npm run db:seed           # first deployment only (creates the owner admin)
npm start                 # serves on 0.0.0.0:3000
```

Recommended: PostgreSQL 14+ managed instance (or the bundled embedded server for small
shops), Nginx/Caddy in front with TLS, `pm2` or Docker for process management.

> **Migrations note:** development uses `prisma db push`. For production run
> `npm run db:migrate` once on a machine with database access to generate
> `prisma/migrations/*`, commit it, and then `npm run db:deploy` on every deploy.

### Offline / restricted networks

If the build machine cannot reach `binaries.prisma.sh`, pre-built Prisma engines can be
vendored into `node_modules/@prisma/engines/` — `scripts/prisma.mjs` detects them and points
the CLI at them through `PRISMA_*_ENGINE_*` environment variables. On a normal network
nothing needs to be set.

---

## 5. Project structure

```
app/
  (shop)/            storefront (layout, home, shop, category, product, cart,
                     checkout, order tracking, account, about, contact)
  admin/             admin panel (dashboard, orders, products, categories,
                     customers, inventory, coupons, reviews, marketing,
                     courier, fraud, settings, users, login)
  api/               REST endpoints (cart, orders, products, auth, upload,
                     tracking, webhooks/steadfast, admin/*)
components/          shared UI + admin widgets
lib/
  cart.ts orders.ts fraud.ts tracking.ts mailer.ts emails.ts images.ts
  settings.ts auth.ts crypto.ts ratelimit.ts queries.ts session.ts
  couriers/          steadfast + parcel service
prisma/              schema.prisma + seed.ts
scripts/             dev / db / prisma wrappers
public/              static assets + generated WebP uploads
middleware.ts        admin route protection
```

---

## 6. Feature completeness notes

* Phone login uses a password (bcrypt) so no SMS gateway is required. If you add an SMS
  provider, wire `SMS_API_*` into `app/api/auth/customer/*` for OTP login.
* Multi-courier fraud history depends on the courier exposing a fraud endpoint. Steadfast
  does; FraudBD-style providers can be plugged in through `FRAUD_API_URL`.
* Rider assignment details are only available through Steadfast status polling/webhooks
  (see the limitation note above).
