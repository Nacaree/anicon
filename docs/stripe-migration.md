# PayWay → Stripe Migration Guide

## Context

ABA PayWay docs are currently inaccessible, making it impossible to implement the real PayWay API integration. Since `PayWayService.java` is already a clean stub (two methods, no real API calls), switching to Stripe is low-risk and well-contained. The 3-step payment flow (initiate → redirect → verify) maps directly onto Stripe Checkout Sessions.

---

## What Stays the Same (~80% of the codebase)

- `TicketService.java` — all business logic, capacity checks, ticket issuance, attendance increment
- `TicketController.java` — all 4 endpoints unchanged
- `EventService.java` + `EventController.java` — no changes
- All DTOs except minor field renames
- The entire RSVP flow (free events, no payment involved)
- Frontend `api.js` client
- Frontend `EventTicketCard.js` (still calls the same endpoints)

---

## What Changes

### 1. `PayWayService.java` → `StripeService.java`

Complete rewrite of the 2-method stub using the Stripe Java SDK.

| PayWay concept | Stripe equivalent |
|---|---|
| Purchase API → returns `checkoutUrl` | `Session session = Session.create(params)` → `session.getUrl()` |
| Check Transaction API → verify `paywayTranId` | `PaymentIntent.retrieve(id)` or webhook `payment_intent.succeeded` |

Add to `pom.xml`:
```xml
<dependency>
  <groupId>com.stripe</groupId>
  <artifactId>stripe-java</artifactId>
  <version>25.x.x</version>
</dependency>
```

Rough implementation shape:
```java
@Service
public class StripeService {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @Value("${stripe.return-url}")
    private String returnUrl;

    public PurchaseResult initiatePayment(UUID eventId, UUID userId, long amountInCents, String returnUrl) {
        Stripe.apiKey = secretKey;
        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(returnUrl + "?session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(returnUrl + "?cancelled=true")
            .addLineItem(SessionCreateParams.LineItem.builder()
                .setQuantity(1L)
                .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                    .setCurrency("usd")
                    .setUnitAmount(amountInCents)
                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                        .setName("Event Ticket")
                        .build())
                    .build())
                .build())
            .build();
        Session session = Session.create(params);
        return new PurchaseResult(session.getPaymentIntent(), session.getUrl());
    }

    public boolean verifyPayment(String paymentIntentId) {
        Stripe.apiKey = secretKey;
        PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
        return "succeeded".equals(intent.getStatus());
    }
}
```

---

### 2. Database — Minor Column Renames

```sql
ALTER TABLE transactions RENAME COLUMN payway_tran_id TO stripe_payment_intent_id;
ALTER TABLE transactions RENAME COLUMN payway_approval_code TO stripe_charge_id;
```

Update the `payment_method` enum — remove ABA Pay / KHQR / WeChat / Alipay, Stripe handles payment method selection in its own UI:
```sql
ALTER TYPE payment_method RENAME TO payment_method_old;
CREATE TYPE payment_method AS ENUM ('card', 'link', 'other');
```

---

### 3. DTOs — Field Renames

**`PurchaseResponse.java`**: `paywayTranId` → `stripePaymentIntentId`

**`PurchaseTicketRequest.java`**: Remove `paymentMethod` field entirely — Stripe's Checkout UI handles method selection, no need to pass it upfront.

**`TransactionResponse.java`**: Rename `paywayTranId` → `stripePaymentIntentId`

---

### 4. `application.properties`

```properties
# Remove:
# payway.return-url=...

# Add:
stripe.secret-key=sk_test_...
stripe.publishable-key=pk_test_...
stripe.webhook-secret=whsec_...
stripe.return-url=http://localhost:3000/payment/verify
```

---

### 5. Verification Flow — Two Options

#### Option A: Redirect (matches current PayWay flow, minimal frontend changes)
- Stripe redirects to `stripe.return-url?session_id={CHECKOUT_SESSION_ID}`
- Frontend extracts `session_id`, calls `POST /api/tickets/verify/{sessionId}`
- Backend calls `StripeService.verifyPayment(sessionId)` — retrieve PaymentIntent and check status

#### Option B: Webhooks (recommended for production reliability)
- Add new endpoint `POST /api/webhooks/stripe`
- Handle `payment_intent.succeeded` event
- Ticket issuance moves to webhook handler — doesn't depend on browser redirect completing
- Requires `stripe.webhook-secret` to verify event signatures

**Recommendation**: Start with Option A to keep the existing flow working, plan Option B for before launch.

---

### 6. Frontend `/payment/verify` Page (new — not yet built)

Read Stripe's redirect params instead of PayWay's:

```js
// PayWay version (hypothetical):
const paywayTranId = searchParams.get('tran_id');

// Stripe version:
const sessionId = searchParams.get('session_id');
const cancelled = searchParams.get('cancelled');
```

Then call `POST /api/tickets/verify/{sessionId}` as before.

---

## Change Surface Summary

| File | Change |
|---|---|
| `PayWayService.java` | Full rewrite → `StripeService.java` (2 methods, stub already) |
| `TicketService.java` | Rename `payWayService` → `stripeService`, update field names |
| `transactions` table | 2 column renames + enum simplification |
| `PurchaseResponse.java` | 1 field rename |
| `PurchaseTicketRequest.java` | Remove `paymentMethod` field |
| `TransactionResponse.java` | 1 field rename |
| `application.properties` | Swap PayWay keys for Stripe keys |
| Frontend `/payment/verify` | Read `session_id` param instead of PayWay's param |
| Everything else | No changes |

---

## Verification Plan

1. Start backend: `./mvnw spring-boot:run`
2. Create a test event via `POST /api/events` with `is_free: false`
3. Call `POST /api/tickets/purchase/{eventId}` — should return a real Stripe Checkout URL
4. Open the checkout URL in browser, use Stripe test card `4242 4242 4242 4242`
5. Confirm redirect back to `localhost:3000/payment/verify?session_id=...`
6. Call `POST /api/tickets/verify/{sessionId}` — should return an issued ticket
7. Call `GET /api/tickets/my` — ticket should appear with status `issued`
8. Verify `events.current_attendance` incremented in Supabase
