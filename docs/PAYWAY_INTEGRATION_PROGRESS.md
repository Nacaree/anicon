# PayWay Integration — Session Progress

## What Was Done

### 1. Audited existing CLAUDE.md

Compared existing project instructions against the live codebase. Key additions made:

- Added `ticketing/` sub-package architecture
- Added full API endpoint reference table
- Added key design patterns section (atomic capacity, money in cents, JOOQ multiset)
- Added current implementation status / TODO list

---

### 2. Confirmed completed TODOs from `TICKETING_BACKEND_PROGRESS.md`

**Already done (confirmed this session):**

- `GlobalExceptionHandler` — `DataIntegrityViolationException` → 409 CONFLICT for duplicate RSVPs
- `mockEvents.js` — already fully removed; no file imports it anymore
- `events/page.js` and `events/[id]/page.js` — already wired to real `eventApi`
- `EventSections.js` — already wired to real `eventApi`

**Still hardcoded (not urgent):**

- `FeaturedEvents.js` — hero carousel with custom shape (tagline/subtitle), not mapped to backend
- `EventTimeline.js` — inline mock events with month/category filter
- `TrendingEvent.js` — single placeholder card
- `PromotedEvents.js` — "promoted" concept has no backend equivalent yet

---

### 3. Bug fix — EventOrganizer `displayName` missing

**File:** `frontend/src/app/events/[id]/page.js`

The organizer object built from `profileApi.getProfileById()` was missing `displayName`, so the organizer card always showed nothing for the name.

**Fix:** Added `displayName: profile.displayName` to the organizer object.

---

### 4. PayWay Purchase API — gap analysis

Compared `PayWayService.java` stub against the PayWay developer docs:

| Gap                                                                     | Status                                   |
| ----------------------------------------------------------------------- | ---------------------------------------- |
| Wrong content type (needed `multipart/form-data`)                       | Fixed                                    |
| HMAC-SHA512 hash generation missing                                     | Fixed                                    |
| `req_time` in `YYYYMMDDHHmmss` UTC format                               | Fixed                                    |
| `merchant_id` from config                                               | Fixed (with TODO comment)                |
| `return_url` must be Base64-encoded                                     | Fixed                                    |
| `payment_option` naming mismatch (our `aba_pay` → PayWay `abapay_khqr`) | Fixed                                    |
| Amount must be dollars not cents                                        | Fixed (converts inside `PayWayService`)  |
| Check Transaction: JSON body with hash                                  | Fixed                                    |
| Check Transaction: reads `payment_status_code == 0`                     | Fixed                                    |
| APV approval code not captured                                          | Fixed (stored in `payway_approval_code`) |
| `VerifyResult` record (previously returned plain `boolean`)             | Fixed                                    |

**Note on RSA keys:** ABA PayWay provides both an API key (string) and RSA keys. Our HMAC-SHA512 implementation uses the **API key string only** — not the RSA keys. RSA keys are for a separate verification layer (webhook signature validation) and are not needed for the Purchase or Check Transaction APIs.

**Note on `tran_id`:** PayWay echoes our `tran_id` back in `status.tran_id` — we generate it ourselves (`"T" + System.currentTimeMillis()` = 14 chars, within the 20-char limit). The `checkout_qr_url` from the response is the URL to redirect users to.

---

### 5. Files changed

#### `backend/src/main/resources/application.properties`

Added:

```properties
payway.merchant-id=${PAYWAY_MERCHANT_ID}
payway.api-key=${PAYWAY_API_KEY}
```

Add these to your `.env` file from the ABA PayWay sandbox dashboard.

#### `backend/pom.xml`

Added Unirest HTTP client (replaced Spring RestTemplate for the PayWay calls):

```xml
<dependency>
    <groupId>com.konghq</groupId>
    <artifactId>unirest-java-core</artifactId>
    <version>4.4.5</version>
</dependency>
```

#### `backend/src/main/java/com/anicon/backend/ticketing/PayWayService.java`

Full rewrite from stub to real implementation:

- **Purchase API:** `multipart/form-data` POST via Unirest, HMAC-SHA512 hash, Base64-encoded `return_url`, payment option name mapping
- **Check Transaction API:** JSON POST via Unirest, hash, reads `payment_status_code == 0`, captures `apv`
- **`PurchaseResult` record:** `tranId` + `checkoutUrl`
- **`VerifyResult` record:** `approved` + `approvalCode` + `rawResponse`

Hash input strings:

- Purchase: `req_time + merchant_id + tran_id + amount`
- Check Transaction: `req_time + merchant_id + tran_id`

Payment option mapping:
| Our enum | PayWay field |
|---|---|
| `card` | `cards` |
| `aba_pay` | `abapay_khqr` |
| `khqr` | `abapay_khqr` |
| `wechat` | `wechat` |
| `alipay` | `alipay` |

#### `backend/src/main/java/com/anicon/backend/ticketing/TicketService.java`

- Updated `verifyAndIssueTicket` to use `VerifyResult` instead of `boolean`
- Now stores `verifyResult.approvalCode()` in `TRANSACTIONS.PAYWAY_APPROVAL_CODE`
- Now stores `verifyResult.rawResponse()` in `TRANSACTIONS.PAYWAY_RESPONSE` (audit trail)
- Added null guard on RSVP insert result
- Fixed `paywayTranId()` → `tranId()` to match renamed record field

#### `frontend/src/lib/api.js`

Added `ticketApi`:

```js
export const ticketApi = {
  purchase: (eventId, paymentMethod = "cards") =>
    api.post(`/api/tickets/purchase/${eventId}`, { paymentMethod }),
  verify: (paywayTranId) => api.post(`/api/tickets/verify/${paywayTranId}`),
  rsvp: (eventId) => api.post(`/api/tickets/rsvp/${eventId}`),
  myTickets: () => api.get("/api/tickets/my"),
};
```

#### `frontend/src/components/events/EventTicketCard.js`

Wired up the "Get Tickets" / "RSVP" button:

- **Free event** → `ticketApi.rsvp()` → button shows "You're Going! 🎉"
- **Paid event** → `ticketApi.purchase()` → `window.location.href = result.checkoutUrl`
- Loading state: "Processing..."
- Error states: 409 → sold out / already going, other → generic message
- Price display: "Free" for free events, `$X.XX` for paid

---

## Remaining TODOs

### Backend

- `PayWayService` is fully implemented but **untested against the real sandbox** — needs credentials in `.env` and an end-to-end test run

### Frontend

- **`/payment/verify` page** — doesn't exist yet. PayWay redirects here after checkout with `tran_id` in the URL. This page needs to:
  1. Read `tran_id` from the URL query params
  2. Call `ticketApi.verify(tranId)`
  3. Show the issued ticket or an error

### Deferred (Month 2–3)

- Refund API
- Close Transaction API
- Ticket types (standard / vip / early_bird)
- Wire `EventTimeline.js`, `TrendingEvent.js` to real API
- Payment method selector UI (currently defaults to `"cards"`)

---

## How to Test PayWay (manual end-to-end)

1. Add `PAYWAY_MERCHANT_ID` and `PAYWAY_API_KEY` to `backend/.env`
2. Start backend: `./mvnw spring-boot:run`
3. Start frontend: `npm run dev`
4. Log in via the frontend, grab JWT from browser console:
   ```js
   const { data } = await supabase.auth.getSession();
   console.log(data.session.access_token);
   ```
5. Create a paid test event:
   ```zsh
   curl -X POST http://localhost:8080/api/events \
     -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "PayWay Test", "location": "Test", "eventDate": "2026-12-01",
       "eventTime": "10:00:00", "eventType": "normal_event",
       "category": "convention", "isFree": false, "ticketPrice": 5.00
     }'
   ```
6. Hit the purchase endpoint → look for `checkoutUrl` in the response
7. Open `checkoutUrl` in browser → complete sandbox payment
8. Read `tran_id` from the redirect URL → call `/api/tickets/verify/{tranId}`

**If PayWay returns error code `"1"` (hash mismatch):** the hash field concatenation order may differ from what's configured in the PayWay merchant dashboard — check the dashboard settings.

Done. Here's what the button now does:

Free event → calls POST /api/tickets/rsvp/{eventId} → button changes to "You're Going! 🎉" and disables

Paid event → calls POST /api/tickets/purchase/{eventId} → redirects window.location.href to checkoutUrl (the PayWay checkout page)

Both → gated behind requireAuth (unauthenticated users see the login modal first), shows "Processing..." while the request is in flight, and surfaces errors inline:

409 → "You're already going!" / "This event is sold out."
anything else → "Something went wrong. Please try again."
The price display also now shows "Free" for free events instead of $undefined.
