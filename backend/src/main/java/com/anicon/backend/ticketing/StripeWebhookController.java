package com.anicon.backend.ticketing;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.StripeObject;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

/**
 * Public webhook endpoint for Stripe payment events.
 *
 * This controller is intentionally NOT protected by JWT — Stripe calls it server-to-server.
 * Authentication is via HMAC signature validation on the raw request body (handled by StripeService).
 *
 * Security is configured in SecurityConfig:
 *   .requestMatchers(HttpMethod.POST, "/api/stripe/webhook").permitAll()
 *
 * IMPORTANT: @RequestBody must receive the raw String body — do not let Spring parse it as JSON.
 * Stripe's signature verification requires the exact original bytes.
 *
 * Currently handles:
 *   payment_intent.succeeded → issues ticket via TicketService
 *
 * Other events (payment_intent.payment_failed, etc.) are acknowledged with 200 but not acted on.
 */
@RestController
@RequestMapping("/api/stripe")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    private final StripeService stripeService;
    private final TicketService ticketService;

    public StripeWebhookController(StripeService stripeService, TicketService ticketService) {
        this.stripeService = stripeService;
        this.ticketService = ticketService;
    }

    /**
     * Receives and processes Stripe webhook events.
     *
     * Always returns 200 for known events to prevent Stripe from retrying.
     * Returns 400 only for invalid signatures (likely not from Stripe).
     *
     * @param payload   Raw request body — must not be pre-parsed
     * @param sigHeader Value of the Stripe-Signature header
     */
    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = stripeService.constructWebhookEvent(payload, sigHeader);
        } catch (SignatureVerificationException e) {
            log.warn("[Stripe] Webhook signature verification failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        log.debug("[Stripe] Received webhook event type={} id={}", event.getType(), event.getId());

        if ("payment_intent.succeeded".equals(event.getType())) {
            Optional<StripeObject> objectOpt = event.getDataObjectDeserializer().getObject();

            PaymentIntent intent;
            if (objectOpt.isPresent()) {
                intent = (PaymentIntent) objectOpt.get();
            } else {
                // getObject() returns empty when the webhook API version doesn't exactly match
                // the SDK's built-in version. deserializeUnsafe() skips the version check.
                try {
                    intent = (PaymentIntent) event.getDataObjectDeserializer().deserializeUnsafe();
                } catch (StripeException e) {
                    log.error("[Stripe] Could not deserialize PaymentIntent from webhook event id={}: {}", event.getId(), e.getMessage());
                    return ResponseEntity.ok().build();
                }
            }

            ticketService.handleStripePaymentSucceeded(intent, payload);
        }
        // Other event types are acknowledged but not acted on

        return ResponseEntity.ok().build();
    }
}
