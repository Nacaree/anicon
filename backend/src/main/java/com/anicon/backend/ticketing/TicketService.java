package com.anicon.backend.ticketing;

import com.anicon.backend.gen.jooq.enums.PaymentMethod;
import com.anicon.backend.gen.jooq.enums.PaymentStatus;
import com.anicon.backend.gen.jooq.enums.TicketStatus;
import com.anicon.backend.gen.jooq.tables.records.TicketsRecord;
import com.anicon.backend.gen.jooq.tables.records.TransactionsRecord;
import com.anicon.backend.ticketing.dto.PurchaseResponse;
import com.anicon.backend.ticketing.dto.RsvpResponse;
import com.anicon.backend.ticketing.dto.TicketResponse;

import com.stripe.model.PaymentIntent;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static com.anicon.backend.gen.jooq.tables.EventRsvps.EVENT_RSVPS;
import static com.anicon.backend.gen.jooq.tables.Events.EVENTS;
import static com.anicon.backend.gen.jooq.tables.Tickets.TICKETS;
import static com.anicon.backend.gen.jooq.tables.Transactions.TRANSACTIONS;

/**
 * Service layer for ticket purchasing, RSVPs, and ticket retrieval.
 *
 * Covers three flows:
 *
 * PAID EVENT — PayWay QR flow (aba_pay, khqr, wechat, alipay):
 *   1. initiatePurchase() → resolves to PayWay branch → creates PENDING transaction, calls PayWay
 *   2. (user scans QR or redirects to PayWay hosted page)
 *   3. verifyAndIssueTicket() → confirm with PayWay, mark PAID, issue ticket, increment attendance
 *
 * PAID EVENT — Stripe card flow (card):
 *   1. initiatePurchase() → resolves to Stripe branch → creates PENDING transaction, creates PaymentIntent
 *   2. (frontend renders Stripe Elements modal, user submits card — no redirect)
 *   3. handleStripePaymentSucceeded() → called by StripeWebhookController on payment_intent.succeeded
 *      → marks PAID, issues ticket, increments attendance
 *
 * FREE EVENT — RSVP flow:
 *   1. rsvpFreeEvent() → insert event_rsvp, increment attendance atomically
 */
@Service
public class TicketService {

    private static final Logger log = LoggerFactory.getLogger(TicketService.class);

    private final DSLContext dsl;
    private final PayWayService payWayService;
    private final StripeService stripeService;

    public TicketService(DSLContext dsl, PayWayService payWayService, StripeService stripeService) {
        this.dsl = dsl;
        this.payWayService = payWayService;
        this.stripeService = stripeService;
    }

    // -------------------------------------------------------------------------
    // Paid event flow — provider routing
    // -------------------------------------------------------------------------

    /**
     * Step 1 of the paid event flow: initiate payment via the appropriate provider.
     *
     * Routes to:
     *   - Stripe  if paymentMethod == "card"
     *   - PayWay  for all other methods (aba_pay, khqr, wechat, alipay)
     *
     * Note: current_attendance is NOT incremented here. It is only incremented
     * after payment is confirmed (verifyAndIssueTicket for PayWay, webhook for Stripe).
     * This prevents phantom capacity locks from abandoned checkouts.
     *
     * @param callerId      UUID of the authenticated buyer (from JWT)
     * @param eventId       The event being purchased
     * @param paymentMethod "card" → Stripe, others → PayWay
     * @param returnUrl     PayWay return URL (unused for Stripe)
     */
    public PurchaseResponse initiatePurchase(UUID callerId, UUID eventId, String paymentMethod, String returnUrl, int quantity) {
        var event = dsl.selectFrom(EVENTS)
                .where(EVENTS.ID.eq(eventId))
                .fetchOne();

        if (event == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        if (event.getIsFree()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This event is free. Use the RSVP endpoint instead.");
        }

        // Capacity check: ensure enough spots for the requested quantity
        if (event.getMaxCapacity() != null
                && event.getCurrentAttendance() + quantity > event.getMaxCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Not enough spots available for the requested quantity");
        }

        // ticket_price is stored as dollars (e.g. 5.00); payment providers use cents (e.g. 500)
        // Multiply by quantity so the payment covers all tickets in one transaction
        long unitPriceInCents = event.getTicketPrice()
                .multiply(BigDecimal.valueOf(100))
                .longValue();
        long amountInCents = unitPriceInCents * quantity;

        // Validate method against the JOOQ enum (covers all valid values: card, aba_pay, khqr, wechat, alipay)
        PaymentMethod method = PaymentMethod.lookupLiteral(paymentMethod);
        if (method == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid payment_method. Must be one of: card, aba_pay, khqr, wechat, alipay");
        }

        if ("card".equals(paymentMethod)) {
            return initiateStripePayment(callerId, eventId, amountInCents, method, quantity);
        } else {
            return initiatePayWayPayment(callerId, eventId, amountInCents, method, paymentMethod, returnUrl, quantity);
        }
    }

    // -------------------------------------------------------------------------
    // Stripe payment flow
    // -------------------------------------------------------------------------

    private PurchaseResponse initiateStripePayment(
            UUID callerId, UUID eventId, long amountInCents, PaymentMethod method, int quantity) {

        StripeService.StripeInitResult stripeResult =
                stripeService.createPaymentIntent(amountInCents, eventId, callerId);

        // Insert PENDING transaction — payway_tran_id is left null (nullable after migration)
        TransactionsRecord transaction = dsl.insertInto(TRANSACTIONS)
                .set(TRANSACTIONS.EVENT_ID, eventId)
                .set(TRANSACTIONS.USER_ID, callerId)
                .set(TRANSACTIONS.STRIPE_PAYMENT_INTENT_ID, stripeResult.paymentIntentId())
                .set(TRANSACTIONS.PAYMENT_PROVIDER, "stripe")
                .set(TRANSACTIONS.AMOUNT, amountInCents)
                .set(TRANSACTIONS.QUANTITY, quantity)
                .set(TRANSACTIONS.PAYMENT_METHOD, method)
                .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.pending)
                .returning()
                .fetchOne();

        // clientSecret goes to the frontend only — not stored in DB
        return PurchaseResponse.builder()
                .transactionId(transaction.getId())
                .stripeClientSecret(stripeResult.clientSecret())
                .amountInCents(transaction.getAmount())
                .paymentProvider("stripe")
                .build();
    }

    /**
     * Called by StripeWebhookController when Stripe fires payment_intent.succeeded.
     *
     * This is the Stripe equivalent of verifyAndIssueTicket() — it finds the pending
     * transaction, atomically increments attendance, marks PAID, and issues the ticket.
     *
     * This method is idempotent: if the transaction is already processed (not PENDING),
     * it logs a warning and returns silently. Stripe may retry webhooks, so we must not
     * double-issue tickets.
     *
     * @param intent   Deserialized PaymentIntent from the Stripe webhook event
     * @param rawEvent Raw Stripe event JSON string for the audit trail
     */
    public void handleStripePaymentSucceeded(PaymentIntent intent, String rawEvent) {
        String paymentIntentId = intent.getId();
        String chargeId = intent.getLatestCharge();

        // Move the SELECT inside the DB transaction with FOR UPDATE so concurrent webhook
        // retries queue up on the lock rather than racing. When the second webhook acquires
        // the lock, the row is already PAID and fetchOne() returns null — it exits cleanly.
        dsl.transaction(ctx -> {
            DSLContext tx = org.jooq.impl.DSL.using(ctx);

            // Lock the row — any concurrent webhook for the same PI will block here until
            // this transaction commits, then find the row already PAID and skip.
            TransactionsRecord transaction = tx.selectFrom(TRANSACTIONS)
                    .where(TRANSACTIONS.STRIPE_PAYMENT_INTENT_ID.eq(paymentIntentId))
                    .and(TRANSACTIONS.PAYMENT_STATUS.eq(PaymentStatus.pending))
                    .forUpdate()
                    .fetchOne();

            if (transaction == null) {
                // Row not found as PENDING — either already processed (idempotency) or unknown PI.
                // Both cases are safe to skip; Stripe receiving 200 prevents further retries.
                log.debug("[Stripe] Skipping already-processed or unknown PaymentIntent: {}", paymentIntentId);
                return;
            }

            UUID eventId = transaction.getEventId();
            UUID userId = transaction.getUserId();
            int quantity = transaction.getQuantity() != null ? transaction.getQuantity() : 1;

            // Atomically increment attendance by the full quantity purchased
            int updated = tx.update(EVENTS)
                    .set(EVENTS.CURRENT_ATTENDANCE, EVENTS.CURRENT_ATTENDANCE.plus(quantity))
                    .where(EVENTS.ID.eq(eventId))
                    .and(EVENTS.MAX_CAPACITY.isNull()
                            .or(EVENTS.CURRENT_ATTENDANCE.plus(quantity).le(EVENTS.MAX_CAPACITY)))
                    .execute();

            if (updated == 0) {
                // Rare: event sold out between purchase initiation and payment confirmation.
                // Mark failed — a refund is a deferred feature (Month 2-3).
                tx.update(TRANSACTIONS)
                        .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.failed)
                        .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                        .where(TRANSACTIONS.ID.eq(transaction.getId()))
                        .execute();
                log.error("[Stripe] Event sold out after Stripe confirmed payment. PI={} eventId={}. Manual refund required.",
                        paymentIntentId, eventId);
                return;
            }

            tx.update(TRANSACTIONS)
                    .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.paid)
                    .set(TRANSACTIONS.PAID_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.STRIPE_CHARGE_ID, chargeId)
                    .set(TRANSACTIONS.STRIPE_RESPONSE, JSONB.valueOf(rawEvent))
                    .where(TRANSACTIONS.ID.eq(transaction.getId()))
                    .execute();

            // Issue one ticket record per purchased seat under the same transaction
            for (int i = 0; i < quantity; i++) {
                String ticketCode = generateTicketCode(eventId, userId);
                tx.insertInto(TICKETS)
                        .set(TICKETS.EVENT_ID, eventId)
                        .set(TICKETS.USER_ID, userId)
                        .set(TICKETS.TRANSACTION_ID, transaction.getId())
                        .set(TICKETS.TICKET_CODE, ticketCode)
                        .set(TICKETS.STATUS, TicketStatus.issued)
                        .execute();
                log.info("[Stripe] Ticket {}/{} issued for PI={} eventId={} userId={} code={}",
                        i + 1, quantity, paymentIntentId, eventId, userId, ticketCode);
            }
        });
    }

    // -------------------------------------------------------------------------
    // PayWay payment flow
    // -------------------------------------------------------------------------

    private PurchaseResponse initiatePayWayPayment(
            UUID callerId, UUID eventId, long amountInCents,
            PaymentMethod method, String paymentMethod, String returnUrl, int quantity) {

        PayWayService.PurchaseResult payWayResult = payWayService.initiatePayment(
                eventId, callerId, amountInCents, paymentMethod, returnUrl);

        TransactionsRecord transaction = dsl.insertInto(TRANSACTIONS)
                .set(TRANSACTIONS.EVENT_ID, eventId)
                .set(TRANSACTIONS.USER_ID, callerId)
                .set(TRANSACTIONS.PAYWAY_TRAN_ID, payWayResult.tranId())
                .set(TRANSACTIONS.PAYMENT_PROVIDER, "payway")
                .set(TRANSACTIONS.AMOUNT, amountInCents)
                .set(TRANSACTIONS.QUANTITY, quantity)
                .set(TRANSACTIONS.PAYMENT_METHOD, method)
                .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.pending)
                .returning()
                .fetchOne();

        return PurchaseResponse.builder()
                .transactionId(transaction.getId())
                .paywayTranId(transaction.getPaywayTranId())
                .amountInCents(transaction.getAmount())
                .checkoutUrl(payWayResult.checkoutUrl())
                .qrImage(payWayResult.qrImage())
                .qrString(payWayResult.qrString())
                .abapayDeeplink(payWayResult.abapayDeeplink())
                .paymentProvider("payway")
                .build();
    }

    /**
     * Step 3 of the PayWay flow: verify payment with PayWay and issue the ticket.
     * Called by the frontend after PayWay redirects back to the return_url.
     */
    public TicketResponse verifyAndIssueTicket(UUID callerId, String paywayTranId) {
        TransactionsRecord transaction = dsl.selectFrom(TRANSACTIONS)
                .where(TRANSACTIONS.PAYWAY_TRAN_ID.eq(paywayTranId))
                .and(TRANSACTIONS.PAYMENT_STATUS.eq(PaymentStatus.pending))
                .fetchOne();

        if (transaction == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Pending transaction not found. It may have already been processed.");
        }

        if (!transaction.getUserId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This transaction does not belong to you");
        }

        PayWayService.VerifyResult verifyResult = payWayService.verifyPayment(paywayTranId);
        if (!verifyResult.approved()) {
            dsl.update(TRANSACTIONS)
                    .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.failed)
                    .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                    .where(TRANSACTIONS.ID.eq(transaction.getId()))
                    .execute();

            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Payment was not confirmed by PayWay");
        }

        UUID eventId = transaction.getEventId();

        int quantity = transaction.getQuantity() != null ? transaction.getQuantity() : 1;

        return dsl.transactionResult(ctx -> {
            DSLContext tx = org.jooq.impl.DSL.using(ctx);

            // Atomically increment attendance by the full quantity purchased
            int updated = tx.update(EVENTS)
                    .set(EVENTS.CURRENT_ATTENDANCE, EVENTS.CURRENT_ATTENDANCE.plus(quantity))
                    .where(EVENTS.ID.eq(eventId))
                    .and(EVENTS.MAX_CAPACITY.isNull()
                            .or(EVENTS.CURRENT_ATTENDANCE.plus(quantity).le(EVENTS.MAX_CAPACITY)))
                    .execute();

            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Event sold out before payment could be confirmed");
            }

            tx.update(TRANSACTIONS)
                    .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.paid)
                    .set(TRANSACTIONS.PAID_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.PAYWAY_APPROVAL_CODE, verifyResult.approvalCode())
                    .set(TRANSACTIONS.PAYWAY_RESPONSE, JSONB.valueOf(verifyResult.rawResponse()))
                    .where(TRANSACTIONS.ID.eq(transaction.getId()))
                    .execute();

            // Issue one ticket record per purchased seat; return the first for the response
            TicketsRecord firstTicket = null;
            for (int i = 0; i < quantity; i++) {
                String ticketCode = generateTicketCode(eventId, callerId);
                TicketsRecord ticket = tx.insertInto(TICKETS)
                        .set(TICKETS.EVENT_ID, eventId)
                        .set(TICKETS.USER_ID, callerId)
                        .set(TICKETS.TRANSACTION_ID, transaction.getId())
                        .set(TICKETS.TICKET_CODE, ticketCode)
                        .set(TICKETS.STATUS, TicketStatus.issued)
                        .returning()
                        .fetchOne();
                if (firstTicket == null) firstTicket = ticket;
            }

            return toTicketResponse(firstTicket);
        });
    }

    // -------------------------------------------------------------------------
    // Free event flow
    // -------------------------------------------------------------------------

    /**
     * RSVP flow for free events: "I'm going".
     */
    public RsvpResponse rsvpFreeEvent(UUID callerId, UUID eventId) {
        var event = dsl.selectFrom(EVENTS)
                .where(EVENTS.ID.eq(eventId))
                .fetchOne();

        if (event == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        if (!event.getIsFree()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This event requires a ticket. Use the purchase endpoint instead.");
        }

        return dsl.transactionResult(ctx -> {
            DSLContext tx = org.jooq.impl.DSL.using(ctx);

            int updated = tx.update(EVENTS)
                    .set(EVENTS.CURRENT_ATTENDANCE, EVENTS.CURRENT_ATTENDANCE.plus(1))
                    .where(EVENTS.ID.eq(eventId))
                    .and(EVENTS.MAX_CAPACITY.isNull()
                            .or(EVENTS.CURRENT_ATTENDANCE.lt(EVENTS.MAX_CAPACITY)))
                    .execute();

            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Event is at full capacity");
            }

            var rsvp = tx.insertInto(EVENT_RSVPS)
                    .set(EVENT_RSVPS.USER_ID, callerId)
                    .set(EVENT_RSVPS.EVENT_ID, eventId)
                    .returning()
                    .fetchOneInto(com.anicon.backend.gen.jooq.tables.records.EventRsvpsRecord.class);

            if (rsvp == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to create RSVP");
            }

            return RsvpResponse.builder()
                    .id(rsvp.getId())
                    .eventId(rsvp.getEventId())
                    .userId(rsvp.getUserId())
                    .createdAt(rsvp.getCreatedAt())
                    .build();
        });
    }

    // -------------------------------------------------------------------------
    // Ticket retrieval
    // -------------------------------------------------------------------------

    public List<TicketResponse> getMyTickets(UUID userId) {
        return dsl.select(
                        TICKETS.ID,
                        TICKETS.EVENT_ID,
                        TICKETS.USER_ID,
                        TICKETS.TRANSACTION_ID,
                        TICKETS.TICKET_CODE,
                        TICKETS.STATUS,
                        TICKETS.CHECKED_IN_AT,
                        TICKETS.CREATED_AT,
                        EVENTS.TITLE,
                        EVENTS.EVENT_DATE,
                        EVENTS.EVENT_TIME,
                        EVENTS.LOCATION,
                        EVENTS.COVER_IMAGE_URL,
                        EVENTS.IS_FREE,
                        EVENTS.TICKET_PRICE
                )
                .from(TICKETS)
                .join(EVENTS).on(TICKETS.EVENT_ID.eq(EVENTS.ID))
                .where(TICKETS.USER_ID.eq(userId))
                .and(TICKETS.STATUS.ne(TicketStatus.cancelled))
                .orderBy(TICKETS.CREATED_AT.desc())
                .fetch()
                .map(r -> TicketResponse.builder()
                        .id(r.get(TICKETS.ID))
                        .eventId(r.get(TICKETS.EVENT_ID))
                        .userId(r.get(TICKETS.USER_ID))
                        .transactionId(r.get(TICKETS.TRANSACTION_ID))
                        .ticketCode(r.get(TICKETS.TICKET_CODE))
                        .status(r.get(TICKETS.STATUS).getLiteral())
                        .checkedInAt(r.get(TICKETS.CHECKED_IN_AT))
                        .createdAt(r.get(TICKETS.CREATED_AT))
                        .eventTitle(r.get(EVENTS.TITLE))
                        .eventDate(r.get(EVENTS.EVENT_DATE))
                        .eventTime(r.get(EVENTS.EVENT_TIME))
                        .eventLocation(r.get(EVENTS.LOCATION))
                        .eventCoverImageUrl(r.get(EVENTS.COVER_IMAGE_URL))
                        .isFree(r.get(EVENTS.IS_FREE))
                        .ticketPrice(r.get(EVENTS.TICKET_PRICE))
                        .build());
    }

    public List<RsvpResponse> getMyRsvps(UUID userId) {
        return dsl.select(
                        EVENT_RSVPS.ID,
                        EVENT_RSVPS.EVENT_ID,
                        EVENT_RSVPS.USER_ID,
                        EVENT_RSVPS.CREATED_AT,
                        EVENTS.TITLE,
                        EVENTS.EVENT_DATE,
                        EVENTS.EVENT_TIME,
                        EVENTS.LOCATION,
                        EVENTS.COVER_IMAGE_URL
                )
                .from(EVENT_RSVPS)
                .join(EVENTS).on(EVENT_RSVPS.EVENT_ID.eq(EVENTS.ID))
                .where(EVENT_RSVPS.USER_ID.eq(userId))
                .orderBy(EVENTS.EVENT_DATE.asc())
                .fetch()
                .map(r -> RsvpResponse.builder()
                        .id(r.get(EVENT_RSVPS.ID))
                        .eventId(r.get(EVENT_RSVPS.EVENT_ID))
                        .userId(r.get(EVENT_RSVPS.USER_ID))
                        .createdAt(r.get(EVENT_RSVPS.CREATED_AT))
                        .eventTitle(r.get(EVENTS.TITLE))
                        .eventDate(r.get(EVENTS.EVENT_DATE))
                        .eventTime(r.get(EVENTS.EVENT_TIME))
                        .eventLocation(r.get(EVENTS.LOCATION))
                        .eventCoverImageUrl(r.get(EVENTS.COVER_IMAGE_URL))
                        .build());
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Generates a unique, human-readable ticket code for event check-in.
     * Format: ANI-{first 8 chars of eventId}-{8 random chars}-{first 8 chars of userId}
     */
    private String generateTicketCode(UUID eventId, UUID userId) {
        String eventPart = eventId.toString().replace("-", "").substring(0, 8).toUpperCase();
        String randomPart = UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        String userPart = userId.toString().replace("-", "").substring(0, 8).toUpperCase();
        return "ANI-" + eventPart + "-" + randomPart + "-" + userPart;
    }

    private TicketResponse toTicketResponse(TicketsRecord r) {
        return TicketResponse.builder()
                .id(r.getId())
                .eventId(r.getEventId())
                .userId(r.getUserId())
                .transactionId(r.getTransactionId())
                .ticketCode(r.getTicketCode())
                .status(r.getStatus().getLiteral())
                .checkedInAt(r.getCheckedInAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
