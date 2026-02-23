package com.anicon.backend.ticketing;

import com.anicon.backend.gen.jooq.enums.PaymentMethod;
import com.anicon.backend.gen.jooq.enums.PaymentStatus;
import com.anicon.backend.gen.jooq.enums.TicketStatus;
import com.anicon.backend.gen.jooq.tables.records.TicketsRecord;
import com.anicon.backend.gen.jooq.tables.records.TransactionsRecord;
import com.anicon.backend.ticketing.dto.PurchaseResponse;
import com.anicon.backend.ticketing.dto.RsvpResponse;
import com.anicon.backend.ticketing.dto.TicketResponse;

import org.jooq.DSLContext;
import org.jooq.JSONB;
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
 * Covers two flows from the schema design guide:
 *
 * PAID EVENT — 3-step PayWay flow:
 *   1. initiatePurchase()    → create PENDING transaction, call PayWay, return checkout URL
 *   2. (user pays on PayWay)
 *   3. verifyAndIssueTicket() → confirm with PayWay, mark PAID, issue ticket, increment attendance
 *
 * FREE EVENT — RSVP flow:
 *   1. rsvpFreeEvent() → insert event_rsvp, increment attendance atomically
 */
@Service
public class TicketService {

    private final DSLContext dsl;
    private final PayWayService payWayService;

    public TicketService(DSLContext dsl, PayWayService payWayService) {
        this.dsl = dsl;
        this.payWayService = payWayService;
    }

    // -------------------------------------------------------------------------
    // Paid event flow
    // -------------------------------------------------------------------------

    /**
     * Step 1 of the paid event flow: initiate a PayWay payment.
     *
     * What this does:
     * - Verifies the event exists and is a paid event
     * - Checks that the event is not sold out
     * - Converts ticket_price (stored as dollars) to cents for PayWay
     * - Calls PayWay Purchase API to get a checkout URL
     * - Creates a PENDING transaction record in the DB
     *
     * Note: current_attendance is NOT incremented here. It is only incremented
     * in verifyAndIssueTicket() after PayWay confirms the payment succeeded.
     * This prevents phantom capacity locks from abandoned checkouts.
     *
     * @param callerId      UUID of the authenticated buyer (from JWT)
     * @param eventId       The event being purchased
     * @param paymentMethod e.g. "card", "aba_pay", "khqr", "wechat", "alipay"
     * @param returnUrl     Frontend URL that PayWay redirects to after checkout
     * @return PurchaseResponse with the paywayTranId and checkoutUrl for the frontend
     */
    public PurchaseResponse initiatePurchase(UUID callerId, UUID eventId, String paymentMethod, String returnUrl) {
        // Fetch the event — we need is_free, ticket_price, and capacity info
        var event = dsl.selectFrom(EVENTS)
                .where(EVENTS.ID.eq(eventId))
                .fetchOne();

        if (event == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        if (event.getIsFree()) {
            // Free events use the RSVP flow, not the purchase flow
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This event is free. Use the RSVP endpoint instead.");
        }

        // Check capacity before initiating payment (quick early rejection)
        if (event.getMaxCapacity() != null
                && event.getCurrentAttendance() >= event.getMaxCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Event is sold out");
        }

        // ticket_price is stored as dollars (e.g. 5.00). PayWay and the transactions
        // table both use cents (e.g. 500). Multiply by 100 and take the long value.
        long amountInCents = event.getTicketPrice()
                .multiply(BigDecimal.valueOf(100))
                .longValue();

        // Parse payment method string into the JOOQ enum
        PaymentMethod method = PaymentMethod.lookupLiteral(paymentMethod);
        if (method == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid payment_method. Must be one of: card, aba_pay, khqr, wechat, alipay");
        }

        // Call PayWay to create the payment session and get the checkout URL
        PayWayService.PurchaseResult payWayResult = payWayService.initiatePayment(
                eventId, callerId, amountInCents, paymentMethod, returnUrl);

        // Store the PENDING transaction. Status will be updated to PAID in verifyAndIssueTicket().
        TransactionsRecord transaction = dsl.insertInto(TRANSACTIONS)
                .set(TRANSACTIONS.EVENT_ID, eventId)
                .set(TRANSACTIONS.USER_ID, callerId)
                .set(TRANSACTIONS.PAYWAY_TRAN_ID, payWayResult.tranId())
                .set(TRANSACTIONS.AMOUNT, amountInCents)
                .set(TRANSACTIONS.PAYMENT_METHOD, method)
                .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.pending)
                .returning()
                .fetchOne();

        return PurchaseResponse.builder()
                .transactionId(transaction.getId())
                .paywayTranId(transaction.getPaywayTranId())
                .amountInCents(transaction.getAmount())
                .checkoutUrl(payWayResult.checkoutUrl())
                .build();
    }

    /**
     * Step 3 of the paid event flow: verify payment with PayWay and issue the ticket.
     *
     * Called by the frontend after PayWay redirects back to the return_url.
     *
     * What this does (all inside one transaction):
     * - Finds the PENDING transaction by paywayTranId
     * - Verifies the caller owns this transaction (prevents other users claiming it)
     * - Calls PayWay Check Transaction API to confirm payment succeeded
     * - Atomically increments current_attendance — if the event just sold out,
     *   the UPDATE returns 0 rows and we throw CONFLICT before issuing the ticket
     * - Marks the transaction as PAID (sets paid_at)
     * - Generates a unique ticket_code and inserts the ticket
     *
     * @param callerId      Must match transaction.user_id (ownership check)
     * @param paywayTranId  The PayWay transaction ID from the initiatePurchase response
     * @return The issued ticket
     */
    public TicketResponse verifyAndIssueTicket(UUID callerId, String paywayTranId) {
        // Find the pending transaction — must be PENDING (not already processed)
        TransactionsRecord transaction = dsl.selectFrom(TRANSACTIONS)
                .where(TRANSACTIONS.PAYWAY_TRAN_ID.eq(paywayTranId))
                .and(TRANSACTIONS.PAYMENT_STATUS.eq(PaymentStatus.pending))
                .fetchOne();

        if (transaction == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Pending transaction not found. It may have already been processed.");
        }

        // Ownership check — only the buyer can claim their own ticket
        if (!transaction.getUserId().equals(callerId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This transaction does not belong to you");
        }

        // Ask PayWay to confirm the payment actually went through
        PayWayService.VerifyResult verifyResult = payWayService.verifyPayment(paywayTranId);
        if (!verifyResult.approved()) {
            // Update transaction to FAILED so it's not retried indefinitely
            dsl.update(TRANSACTIONS)
                    .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.failed)
                    .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                    .where(TRANSACTIONS.ID.eq(transaction.getId()))
                    .execute();

            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Payment was not confirmed by PayWay");
        }

        UUID eventId = transaction.getEventId();

        return dsl.transactionResult(ctx -> {
            DSLContext tx = org.jooq.impl.DSL.using(ctx);

            // Atomically increment current_attendance.
            // The WHERE clause also enforces capacity — if the event just filled up
            // (race condition with another buyer), this UPDATE returns 0 rows.
            int updated = tx.update(EVENTS)
                    .set(EVENTS.CURRENT_ATTENDANCE, EVENTS.CURRENT_ATTENDANCE.plus(1))
                    .where(EVENTS.ID.eq(eventId))
                    .and(EVENTS.MAX_CAPACITY.isNull()
                            .or(EVENTS.CURRENT_ATTENDANCE.lt(EVENTS.MAX_CAPACITY)))
                    .execute();

            if (updated == 0) {
                // Event filled up between purchase initiation and verification
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Event sold out before payment could be confirmed");
            }

            // Mark the transaction as PAID and record the timestamp
            tx.update(TRANSACTIONS)
                    .set(TRANSACTIONS.PAYMENT_STATUS, PaymentStatus.paid)
                    .set(TRANSACTIONS.PAID_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.UPDATED_AT, OffsetDateTime.now())
                    .set(TRANSACTIONS.PAYWAY_APPROVAL_CODE, verifyResult.approvalCode())
                    .set(TRANSACTIONS.PAYWAY_RESPONSE, JSONB.valueOf(verifyResult.rawResponse()))
                    .where(TRANSACTIONS.ID.eq(transaction.getId()))
                    .execute();

            // Generate a unique scannable ticket code
            // Format: ANI-{first 8 chars of eventId}-{8 random chars}-{first 8 chars of userId}
            String ticketCode = generateTicketCode(eventId, callerId);

            // Issue the ticket
            TicketsRecord ticket = tx.insertInto(TICKETS)
                    .set(TICKETS.EVENT_ID, eventId)
                    .set(TICKETS.USER_ID, callerId)
                    .set(TICKETS.TRANSACTION_ID, transaction.getId())
                    .set(TICKETS.TICKET_CODE, ticketCode)
                    .set(TICKETS.STATUS, TicketStatus.issued)
                    .returning()
                    .fetchOne();

            return toTicketResponse(ticket);
        });
    }

    // -------------------------------------------------------------------------
    // Free event flow
    // -------------------------------------------------------------------------

    /**
     * RSVP flow for free events: "I'm going".
     *
     * What this does (inside one transaction):
     * - Verifies the event exists and is free
     * - Atomically increments current_attendance with capacity enforcement
     * - Inserts into event_rsvps — the DB unique constraint on (user_id, event_id)
     *   automatically rejects duplicate RSVPs, so no extra check is needed here
     *
     * @param callerId UUID of the authenticated user (from JWT)
     * @param eventId  The free event being RSVPed for
     * @return The created RSVP record
     */
    public RsvpResponse rsvpFreeEvent(UUID callerId, UUID eventId) {
        // Fetch the event to verify it exists and is free
        var event = dsl.selectFrom(EVENTS)
                .where(EVENTS.ID.eq(eventId))
                .fetchOne();

        if (event == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found");
        }
        if (!event.getIsFree()) {
            // Paid events need the purchase flow
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This event requires a ticket. Use the purchase endpoint instead.");
        }

        return dsl.transactionResult(ctx -> {
            DSLContext tx = org.jooq.impl.DSL.using(ctx);

            // Atomically increment attendance, enforcing capacity in the same UPDATE.
            // If the event is full, 0 rows are updated and we throw before inserting the RSVP.
            int updated = tx.update(EVENTS)
                    .set(EVENTS.CURRENT_ATTENDANCE, EVENTS.CURRENT_ATTENDANCE.plus(1))
                    .where(EVENTS.ID.eq(eventId))
                    .and(EVENTS.MAX_CAPACITY.isNull()
                            .or(EVENTS.CURRENT_ATTENDANCE.lt(EVENTS.MAX_CAPACITY)))
                    .execute();

            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Event is at full capacity");
            }

            // Insert the RSVP. The unique constraint on (user_id, event_id) will throw a
            // DataIntegrityViolationException if the user already RSVPed — Spring Boot will
            // surface this as a 500, but the GlobalExceptionHandler can catch it and return 409.
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

    /**
     * Returns all non-cancelled tickets for the authenticated user.
     * Used to power the "My Tickets" page in the frontend.
     *
     * @param userId UUID of the authenticated user
     */
    public List<TicketResponse> getMyTickets(UUID userId) {
        return dsl.selectFrom(TICKETS)
                .where(TICKETS.USER_ID.eq(userId))
                .and(TICKETS.STATUS.ne(TicketStatus.cancelled))
                .orderBy(TICKETS.CREATED_AT.desc())
                .fetch()
                .map(this::toTicketResponse);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Generates a unique, human-readable ticket code for event check-in.
     *
     * Format: ANI-{first 8 chars of eventId}-{8 random chars}-{first 8 chars of userId}
     * Example: ANI-A1B2C3D4-E5F6G7H8-I9J0K1L2
     *
     * The random middle segment ensures uniqueness even if the same user
     * buys multiple tickets for the same event (e.g. for guests).
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
