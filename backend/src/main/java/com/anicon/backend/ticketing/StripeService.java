package com.anicon.backend.ticketing;

import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Stripe payment gateway integration.
 *
 * Handles card payments via Stripe PaymentIntents + Stripe Elements (embedded UI).
 * Completely separate from PayWayService — no PayWay logic here.
 *
 * Flow:
 *   1. createPaymentIntent() — called by TicketService when user picks "card"
 *      → returns clientSecret to the frontend for Stripe Elements
 *   2. Frontend renders <PaymentElement>, user submits card
 *      → Stripe.js confirms payment client-side (no redirect for cards)
 *   3. Stripe fires payment_intent.succeeded webhook to POST /api/stripe/webhook
 *      → StripeWebhookController calls TicketService.handleStripePaymentSucceeded()
 *      → ticket is issued server-side
 */
@Service
public class StripeService {

    private static final Logger log = LoggerFactory.getLogger(StripeService.class);

    @Value("${stripe.secret-key}")
    private String secretKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
        log.info("[Stripe] Initialized with key prefix: {}", secretKey.substring(0, 7));
    }

    /**
     * Result of a successful PaymentIntent creation.
     *
     * @param paymentIntentId  pi_xxx — stored in transactions.stripe_payment_intent_id
     *                         Used by the webhook to find the pending transaction.
     * @param clientSecret     pi_xxx_secret_xxx — sent to frontend ONLY, never stored in DB.
     *                         Required by Stripe.js to confirm payment.
     */
    public record StripeInitResult(String paymentIntentId, String clientSecret) {}

    /**
     * Creates a Stripe PaymentIntent for a card payment.
     *
     * The returned clientSecret is passed to the frontend's Stripe Elements component.
     * We do NOT store the clientSecret in the database — it is frontend-only.
     * The paymentIntentId is stored in transactions.stripe_payment_intent_id for webhook lookup.
     *
     * @param amountInCents Amount in cents (e.g. 500 = $5.00) — Stripe always uses the smallest currency unit
     * @param eventId       Stored as PaymentIntent metadata for tracing in webhook
     * @param userId        Stored as PaymentIntent metadata for tracing in webhook
     */
    public StripeInitResult createPaymentIntent(long amountInCents, UUID eventId, UUID userId) {
        try {
            PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                    .setAmount(amountInCents)
                    .setCurrency("usd")
                    // Only cards — no redirect-based methods (AliPay, etc.) since we want embedded UX
                    .addPaymentMethodType("card")
                    // Metadata for webhook tracing — lets us find the right transaction row
                    .putMetadata("eventId", eventId.toString())
                    .putMetadata("userId", userId.toString())
                    .build();

            PaymentIntent intent = PaymentIntent.create(params);

            log.debug("[Stripe] Created PaymentIntent id={} for event={} user={}", intent.getId(), eventId, userId);

            return new StripeInitResult(intent.getId(), intent.getClientSecret());

        } catch (StripeException e) {
            log.error("[Stripe] Failed to create PaymentIntent for event={}: {}", eventId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "Failed to create Stripe payment: " + e.getMessage());
        }
    }

    /**
     * Cancels a Stripe PaymentIntent. Called when the user abandons checkout.
     *
     * The caller should catch StripeException and log a warning rather than propagating —
     * a failed cancel is non-critical since Stripe auto-expires uncompleted PIs after 24h.
     *
     * @param paymentIntentId The pi_xxx ID stored in transactions.stripe_payment_intent_id
     * @throws StripeException if Stripe rejects the cancel (e.g. PI already succeeded)
     */
    public void cancelPaymentIntent(String paymentIntentId) throws StripeException {
        PaymentIntent intent = PaymentIntent.retrieve(paymentIntentId);
        intent.cancel();
        log.debug("[Stripe] Cancelled PaymentIntent id={}", paymentIntentId);
    }

    /**
     * Validates a Stripe webhook signature and returns the parsed Event.
     *
     * Called by StripeWebhookController — NOT by TicketService.
     * The payload must be the raw request body bytes (before any parsing).
     * Throws SignatureVerificationException if the signature is invalid.
     *
     * @param payload   Raw request body as a String (must not be parsed/modified)
     * @param sigHeader Value of the Stripe-Signature request header
     * @return Validated Stripe Event
     * @throws SignatureVerificationException if the signature does not match
     */
    public Event constructWebhookEvent(String payload, String sigHeader)
            throws SignatureVerificationException {
        return Webhook.constructEvent(payload, sigHeader, webhookSecret);
    }
}
