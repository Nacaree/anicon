package com.anicon.backend.ticketing;

import com.anicon.backend.security.SupabaseUserPrincipal;
import com.anicon.backend.ticketing.dto.EventTicketStatusResponse;
import com.anicon.backend.ticketing.dto.PurchaseResponse;
import com.anicon.backend.ticketing.dto.PurchaseTicketRequest;
import com.anicon.backend.ticketing.dto.RsvpResponse;
import com.anicon.backend.ticketing.dto.TicketResponse;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * REST controller for ticket purchasing, RSVPs, and ticket retrieval.
 *
 * All endpoints require authentication (JWT) — see SecurityConfig.
 *
 * Endpoint summary:
 *   POST /api/tickets/purchase/{eventId}    — Initiate PayWay payment for a paid event
 *   POST /api/tickets/verify/{paywayTranId} — Verify payment with PayWay, issue ticket
 *   POST /api/tickets/rsvp/{eventId}        — RSVP for a free event
 *   GET  /api/tickets/my                    — Get the caller's tickets
 *
 * Paid event flow:
 *   1. Frontend calls POST /purchase → receives checkoutUrl
 *   2. Frontend redirects user to checkoutUrl (PayWay checkout page)
 *   3. PayWay redirects user back to the frontend return_url
 *   4. Frontend calls POST /verify/{paywayTranId} → receives issued ticket
 */
@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;

    @Value("${payway.return-url}")
    private String paywayReturnUrl;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    /**
     * Initiates a PayWay payment for a paid event.
     *
     * Creates a PENDING transaction and returns the PayWay checkout URL.
     * The frontend must redirect the user to checkoutUrl to complete payment.
     *
     * @param eventId   The paid event to purchase a ticket for
     * @param req       Contains the chosen payment method
     * @param principal The authenticated buyer
     */
    @PostMapping("/purchase/{eventId}")
    public ResponseEntity<PurchaseResponse> purchase(
            @PathVariable UUID eventId,
            @Valid @RequestBody PurchaseTicketRequest req,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());

        // paywayReturnUrl is configured in application.properties (payway.return-url).
        // The frontend handles this route and calls POST /verify/{paywayTranId}.
        PurchaseResponse response = ticketService.initiatePurchase(
                callerId, eventId, req.getPaymentMethod(), paywayReturnUrl, req.getQuantity());

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Verifies a completed PayWay payment and issues the ticket.
     *
     * Called by the frontend after PayWay redirects back to the return_url.
     * The paywayTranId is passed as a path variable (or can be extracted from
     * the PayWay redirect query params and forwarded here).
     *
     * On success: transaction is marked PAID, ticket is issued, attendance incremented.
     * On failure: transaction is marked FAILED, 402 is returned.
     *
     * @param paywayTranId The PayWay transaction ID from the purchase response
     * @param principal    Must match the original buyer (ownership check in service)
     */
    @PostMapping("/verify/{paywayTranId}")
    public ResponseEntity<TicketResponse> verify(
            @PathVariable String paywayTranId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        TicketResponse ticket = ticketService.verifyAndIssueTicket(callerId, paywayTranId);

        return ResponseEntity.status(HttpStatus.CREATED).body(ticket);
    }

    /**
     * RSVPs the authenticated user for a free event.
     *
     * Increments current_attendance atomically and inserts an event_rsvp record.
     * The DB unique constraint on (user_id, event_id) prevents duplicate RSVPs.
     *
     * @param eventId   The free event to RSVP for
     * @param principal The authenticated user
     */
    @PostMapping("/rsvp/{eventId}")
    public ResponseEntity<RsvpResponse> rsvp(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        RsvpResponse rsvp = ticketService.rsvpFreeEvent(callerId, eventId);

        return ResponseEntity.status(HttpStatus.CREATED).body(rsvp);
    }

    /**
     * Cancels a pending Stripe checkout the user abandoned.
     *
     * Called fire-and-forget from the frontend when the user clicks "Leave" on the
     * Stripe payment modal. Cancels the PaymentIntent on Stripe's side and marks the
     * transaction cancelled in the DB so stale pending rows don't accumulate.
     *
     * Returns 200 OK in all cases (including not-found / already-cancelled) so the
     * frontend never needs to handle errors from this call.
     *
     * @param transactionId Our internal transaction UUID from the purchase response
     * @param principal     Must match the original buyer (ownership check in service)
     */
    @PostMapping("/{transactionId}/cancel")
    public ResponseEntity<Void> cancelStripePayment(
            @PathVariable UUID transactionId,
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        ticketService.cancelStripePayment(callerId, transactionId);
        return ResponseEntity.ok().build();
    }

    /**
     * Returns ticket count + RSVP status for the current user on a specific event.
     *
     * This endpoint is publicly accessible (no auth required) so the frontend can fire it
     * immediately on page load without waiting for auth initialization. The frontend sends
     * a cached token if one is available (bestEffortAuth mode); guests send no token at all.
     *
     *   - principal != null → real counts for the authenticated user
     *   - principal == null → zeros (guest or token not yet available)
     *
     * Called by EventTicketCard on mount to personalize the "Grab Your Tickets" card:
     *   - ticketCount > 0 → show "You have X ticket(s)" badge (paid events)
     *   - hasRsvp = true  → show "You're Going!" disabled state (free events)
     *
     * @param eventId   The event being viewed
     * @param principal The authenticated user, or null if the request was unauthenticated
     */
    @GetMapping("/event-status/{eventId}")
    public ResponseEntity<EventTicketStatusResponse> eventStatus(
            @PathVariable UUID eventId,
            @AuthenticationPrincipal(errorOnInvalidType = false) SupabaseUserPrincipal principal) {

        // principal is null for guests or when the frontend fires before auth initializes.
        // Service handles null by returning {ticketCount: 0, hasRsvp: false} immediately.
        UUID callerId = principal != null ? principal.getUserId() : null;
        return ResponseEntity.ok(ticketService.getEventStatus(callerId, eventId));
    }

    /**
     * Returns all non-cancelled tickets for the authenticated user.
     * Powers the "My Tickets" page in the frontend.
     *
     * @param principal The authenticated user
     */
    @GetMapping("/my")
    public ResponseEntity<List<TicketResponse>> myTickets(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.ok(ticketService.getMyTickets(callerId));
    }

    /**
     * Returns all RSVPs for the authenticated user (free events only).
     * Used alongside GET /my to power the "My Tickets" page.
     *
     * @param principal The authenticated user
     */
    @GetMapping("/my-rsvps")
    public ResponseEntity<List<RsvpResponse>> myRsvps(
            @AuthenticationPrincipal SupabaseUserPrincipal principal) {

        UUID callerId = Objects.requireNonNull(principal.getUserId());
        return ResponseEntity.ok(ticketService.getMyRsvps(callerId));
    }
}
