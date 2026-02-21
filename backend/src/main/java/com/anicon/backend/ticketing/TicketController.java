package com.anicon.backend.ticketing;

import com.anicon.backend.security.SupabaseUserPrincipal;
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
                callerId, eventId, req.getPaymentMethod(), paywayReturnUrl);

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
}
