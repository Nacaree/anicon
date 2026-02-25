# Hybrid Payment System — Build Session Summary

**Date:** 2026-02-25
**Branch:** `feature-ticket`
**Status:** Code complete. Awaiting DB migration + JOOQ codegen to compile.

---

## What Was Built

A hybrid payment system combining **PayWay (ABA)** for QR payments and **Stripe** for card payments. Clean provider separation throughout the stack. The user picks a payment method from a modal — each choice triggers its own isolated flow.

### Flow Summary

| Method | Provider | UI | Ticket Issuance |
|---|---|---|---|
| QR / ABA Pay | PayWay | Redirects to external QR page → manual "I've Paid" verify | Synchronous (verify endpoint) |
| Credit / Debit Card | Stripe | Embedded modal on site (never leaves) | Async via `payment_intent.succeeded` webhook (~1-2s) |
| Free RSVP | N/A | Button click (unchanged) | Synchronous |

---

## Database Migration

Run in **Supabase SQL editor**, then run `./mvnw jooq-codegen:generate`:

```sql
-- Make payway_tran_id nullable — Stripe rows don't have one
ALTER TABLE transactions ALTER COLUMN payway_tran_id DROP NOT NULL;

-- Provider identifier: "payway" or "stripe"
ALTER TABLE transactions
  ADD COLUMN payment_provider varchar(20) NOT NULL DEFAULT 'payway'
  CONSTRAINT valid_payment_provider CHECK (payment_provider IN ('payway', 'stripe'));

-- Stripe-specific columns
ALTER TABLE transactions ADD COLUMN stripe_payment_intent_id varchar(255) UNIQUE;
ALTER TABLE transactions ADD COLUMN stripe_charge_id varchar(255);
ALTER TABLE transactions ADD COLUMN stripe_response jsonb;

CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);
```

**Why these changes:**
- `payment_provider` — explicitly identifies which gateway processed the row, instead of inferring from null checks. Makes queries and service branching unambiguous.
- `payway_tran_id` nullable — Stripe rows have no PayWay tran ID. The old `NOT NULL` blocked Stripe inserts.
- `stripe_payment_intent_id` — Stripe's equivalent of `payway_tran_id`. Used by the webhook to find the pending transaction.
- `stripe_response jsonb` — mirrors `payway_response` for a consistent audit trail.
- `payment_method` enum **unchanged** — `card` already exists and accurately describes the user's choice regardless of which gateway processes it.

---

## Backend Changes

### New Files

#### `StripeService.java`
`backend/src/main/java/com/anicon/backend/ticketing/StripeService.java`

Two methods, zero PayWay logic:
- `createPaymentIntent(amountInCents, eventId, userId)` → `StripeInitResult(paymentIntentId, clientSecret)`
  - Creates a Stripe PaymentIntent with `currency=usd`, `payment_method_types=["card"]`
  - `eventId` and `userId` stored as PaymentIntent metadata for webhook tracing
  - `clientSecret` goes to frontend only — **never stored in DB**
- `constructWebhookEvent(payload, sigHeader)` → validates Stripe HMAC signature, returns `Event`

#### `StripeWebhookController.java`
`backend/src/main/java/com/anicon/backend/ticketing/StripeWebhookController.java`

- `POST /api/stripe/webhook` — **public endpoint** (no JWT). Authenticates via Stripe HMAC signature.
- `@RequestBody String payload` — raw body string required for signature verification (must not be pre-parsed).
- On `payment_intent.succeeded` → calls `ticketService.handleStripePaymentSucceeded(intent, rawJson)`
- Returns 400 on bad signature, 200 on all known events (prevents Stripe retries).

### Modified Files

#### `TicketService.java`
Key changes:
1. Injected `StripeService` alongside existing `PayWayService`
2. `initiatePurchase()` now routes on `paymentMethod`:
   - `"card"` → `initiateStripePayment()` private method
   - everything else → `initiatePayWayPayment()` private method (existing logic, unchanged)
3. New `handleStripePaymentSucceeded(PaymentIntent, rawJson)`:
   - Looks up pending transaction by `stripe_payment_intent_id`
   - **Idempotent** — if already processed, logs warning and returns silently (Stripe retries webhooks)
   - Same atomic attendance-increment + capacity-enforcement + ticket-issue logic as PayWay path
   - If sold out after payment confirmed: marks transaction `FAILED`, logs for manual refund

#### `PurchaseResponse.java` (DTO)
Added two fields:
- `String paymentProvider` — `"stripe"` or `"payway"` (frontend uses to decide which flow to enter)
- `String stripeClientSecret` — Stripe PaymentIntent client secret for Stripe Elements (null for PayWay)

#### `SecurityConfig.java`
Added webhook permit rule:
```java
.requestMatchers(HttpMethod.POST, "/api/stripe/webhook").permitAll()
```

#### `pom.xml`
Added Stripe Java SDK:
```xml
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>27.1.0</version>
</dependency>
```

#### `application.properties`
Added Stripe config:
```properties
stripe.secret-key=${STRIPE_SECRET_KEY}
stripe.webhook-secret=${STRIPE_WEBHOOK_SECRET}
```

---

## Frontend Changes

### New Files

#### `PaymentMethodModal.js`
`frontend/src/components/payments/PaymentMethodModal.js`

Payment method selector modal — shown when user clicks "Get Tickets" on a paid event.
- **QR / ABA Pay** option → calls `ticketApi.purchase(eventId, "aba_pay")` → calls `onQrSelected(result)`
- **Credit / Debit Card** option → calls `ticketApi.purchase(eventId, "card")` → calls `onCardSelected(clientSecret, amountInCents)`
- Uses shadcn `Dialog` component. Per-button loading spinners. 409 (sold out) error handling.

#### `StripePaymentModal.js`
`frontend/src/components/payments/StripePaymentModal.js`

Embedded Stripe Elements modal — shown after user picks "Credit / Debit Card".
- `<Elements stripe={stripePromise} options={{clientSecret, appearance}}>` wraps `<PaymentElement>`
- `stripe.confirmPayment({ elements, redirect: "if_required" })` — cards resolve inline, no redirect
- Brand color `#FF7927` applied via `appearance.variables.colorPrimary`
- On success: calls `onSuccess()` — ticket issued async by webhook, not synchronously

### Modified Files

#### `EventTicketCard.js`
- "Get Tickets" now opens `PaymentMethodModal` instead of directly calling `ticketApi.purchase()`
- Free event RSVP flow unchanged
- New state: `methodModalOpen`, `stripeModalOpen`, `stripeClientSecret`, `stripeAmountInCents`
- `handleQrSelected()` → closes modal → stores QR in sessionStorage → navigates to `/payment/checkout` (existing flow)
- `handleCardSelected()` → closes method modal → opens `StripePaymentModal` with clientSecret
- `handleStripeSuccess()` → closes Stripe modal → navigates to `/payment/success?provider=stripe`

#### `payment/success/page.js`
- Reads `?provider=stripe` query param
- Shows `"Payment confirmed! Your ticket will appear in My Tickets within a few seconds."` for Stripe (since ticket is issued async via webhook)
- Wrapped in `<Suspense>` boundary (required by Next.js for `useSearchParams()`)

### npm packages added
```bash
npm install @stripe/react-stripe-js @stripe/stripe-js
```

---

## Environment Variables

### Backend (`backend/.env`)
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Local Development Setup

### Option A — Stripe CLI (recommended for webhooks)
```zsh
# Install
brew install stripe/stripe-cli/stripe

# Login once
stripe login

# Forward webhooks to local backend (prints the whsec_ secret)
stripe listen --forward-to localhost:8080/api/stripe/webhook
```
Copy the printed `whsec_` value into `backend/.env` as `STRIPE_WEBHOOK_SECRET`.

### Option B — Stripe Dashboard webhook
Requires a public URL (ngrok, etc.) since Stripe's servers can't reach `localhost`.
> **Note:** lcl.host does NOT work for Stripe webhooks — it maps `yourapp.lcl.host` to `127.0.0.1` in local DNS only. Stripe's servers can't resolve that. Use Stripe CLI or ngrok instead.

---

## Steps to Get It Running

1. **Run DB migration** in Supabase SQL editor (SQL above)
2. **Regenerate JOOQ types:** `cd backend && ./mvnw jooq-codegen:generate`
3. **Verify build:** `./mvnw clean install`
4. **Add env vars** to `backend/.env` and `frontend/.env.local`
5. **Start Stripe CLI** forwarding (or set up ngrok + Dashboard webhook)
6. **Start backend:** `./mvnw spring-boot:run`
7. **Start frontend:** `cd frontend && npm run dev`

---

## Testing

### Stripe card path
- Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Declined card: `4000 0000 0000 9995`
- Click "Get Tickets" → pick "Credit / Debit Card" → card form appears in modal → pay without leaving site → ticket appears in My Tickets

### PayWay QR path (unchanged)
- Ensure `payway.mock-approved=true` in `application.properties`
- Click "Get Tickets" → pick "QR Code / ABA Pay" → existing `/payment/checkout` flow

### Security checks
- `POST /api/stripe/webhook` with bad/missing `Stripe-Signature` → 400
- `POST /api/tickets/purchase/{eventId}` without JWT → 403
- `stripeClientSecret` never appears in the `transactions` table

---

## Architecture Decisions

**Why a separate `StripeWebhookController`?**
The webhook authenticates via HMAC on the raw request body — not JWT. Mixing it into `TicketController` would require disabling JWT for a specific method in a fragile way. A dedicated controller with `@RequestBody String` (preserves raw bytes) is the cleanest isolation.

**Why not Stripe Checkout Session (hosted)?**
The requirement was an embedded modal experience. Stripe Elements with `PaymentElement` achieves this. Stripe Checkout Session would redirect to Stripe's hosted page.

**Why `payment_provider` column instead of inferring from nullable ID columns?**
Explicit is better than implicit. An explicit `varchar(20)` column is self-documenting, indexable, and makes the `TicketService` branching unambiguous. It also future-proofs for a third provider.

**Why does the frontend navigate to success before the webhook fires?**
`stripe.confirmPayment()` resolves after Stripe confirms the PaymentIntent as `succeeded` — the payment is real. The webhook is Stripe notifying your server, typically within 1-2 seconds. Showing "your ticket will appear shortly" is the standard UX pattern for webhook-backed payment systems.

**Why keep `payment_method` enum unchanged?**
`card` accurately describes the user's chosen method regardless of which gateway processes it. The gateway identity is captured by `payment_provider`. Changing the enum would require a heavier migration.

---

## Deferred (Month 2-3)

- Stripe refund API (mirrors planned PayWay refund feature)
- Handle `payment_intent.payment_failed` webhook event (currently acknowledged but ignored)
- Show ticket immediately on success page for Stripe (would require polling `GET /api/tickets/my` or a WebSocket)
