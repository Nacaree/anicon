# Stripe Webhook Dual-Consumer Bug

## Summary

Stripe payments were only issuing **1 ticket** regardless of the quantity selected, and the local backend logged `[Stripe] Skipping already-processed or unknown PaymentIntent` even for fresh payments.

---

## Root Cause

Two separate webhook consumers were processing the same `payment_intent.succeeded` event for every payment:

| Consumer | Endpoint | Code version |
|---|---|---|
| Stripe Dashboard endpoint | `https://anicon-production.up.railway.app/api/stripe/webhook` | `main` branch (old — no multi-ticket loop) |
| Stripe CLI (local dev) | `localhost:8080/api/stripe/webhook` | `feature-ticket` branch (new — correct) |

Both consumers connect to the **same Supabase database**. Railway received the event first (dashboard endpoint fires before CLI forwarding), processed the transaction with old code that had no quantity loop, issued **exactly 1 ticket**, and marked the transaction `paid`. The local backend then received the same event via Stripe CLI, found the transaction already `paid`, and skipped.

### Evidence

```
19:03:31 INFO  [local]   [Stripe] Inserted PENDING transaction id=a09e... piId=pi_3T7x6N... quantity=7
19:03:43 DEBUG [local]   [Stripe] Received webhook event type=payment_intent.succeeded id=evt_...
19:03:43 DEBUG [local]   [Stripe] Skipping already-processed or unknown PaymentIntent: pi_3T7x6N...
```

```sql
-- DB result after payment:
quantity=7, ticket_count=1, payment_status=paid
```

The transaction row was `pending` at 19:03:31, but `paid` with 1 ticket by 19:03:43 — before the local webhook handler could act on it. Railway processed it in that 12-second window.

---

## Fix

### For Local Development

**Disable** the Railway webhook endpoint in the Stripe Dashboard while developing on a feature branch:

1. Stripe Dashboard → **Developers → Webhooks**
2. Find `https://anicon-production.up.railway.app/api/stripe/webhook`
3. Click → **Disable endpoint** (do not delete — re-enable on deploy)

Also confirm `application-dev.properties` uses the **Stripe CLI signing secret** (the `whsec_test_...` value printed by `stripe listen`), not the dashboard endpoint secret.

With the dashboard endpoint disabled, only Stripe CLI delivers events to `localhost:8080`. Railway is not involved.

### For Production Deploy

1. Merge the feature branch to `main` — Railway auto-deploys with the latest code
2. **Re-enable** the Railway webhook endpoint in Stripe Dashboard
3. Confirm Railway's `STRIPE_WEBHOOK_SECRET` env var matches the dashboard endpoint's signing secret (not the CLI one)

---

## Code Changes Made During Investigation

### Race condition fix (kept)

Moved the `SELECT` inside `dsl.transaction()` with `FOR UPDATE` in `handleStripePaymentSucceeded()` (`TicketService.java`). Prevents double-processing if Stripe retries a webhook while another delivery is still in-flight:

```java
// Before: SELECT outside transaction — concurrent webhooks can both see PENDING
TransactionsRecord transaction = dsl.selectFrom(TRANSACTIONS)
    .where(...STRIPE_PAYMENT_INTENT_ID.eq(paymentIntentId))
    .and(...PAYMENT_STATUS.eq(PaymentStatus.pending))
    .fetchOne();
if (transaction == null) { log.warn(...); return; }
dsl.transactionResult(ctx -> { ... });

// After: SELECT FOR UPDATE inside transaction — second webhook blocks, then skips cleanly
dsl.transaction(ctx -> {
    DSLContext tx = DSL.using(ctx);
    TransactionsRecord transaction = tx.selectFrom(TRANSACTIONS)
        .where(...STRIPE_PAYMENT_INTENT_ID.eq(paymentIntentId))
        .and(...PAYMENT_STATUS.eq(PaymentStatus.pending))
        .forUpdate()
        .fetchOne();
    if (transaction == null) {
        log.debug("[Stripe] Skipping already-processed or unknown PaymentIntent: {}", paymentIntentId);
        return;
    }
    // ... process ...
});
```

---

## Why This Didn't Affect PayWay

PayWay uses a **pull model**: the frontend calls `POST /api/tickets/verify/{paywayTranId}` explicitly after the user returns from the PayWay checkout page. Only the local backend receives this request — there is no race with Railway. Stripe's push model (webhooks) is what created the dual-consumer problem.

---

## Prevention

When adding new webhook integrations, always use **separate signing secrets** per environment:

- **Local dev**: Stripe CLI secret (`whsec_test_...`) in `application-dev.properties`
- **Production (Railway)**: Dashboard endpoint secret in Railway env vars

This ensures each environment only processes its own events, even if both share a database.
