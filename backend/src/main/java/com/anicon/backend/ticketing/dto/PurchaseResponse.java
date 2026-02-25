package com.anicon.backend.ticketing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Returned when a user initiates a ticket purchase for a paid event.
 *
 * The paymentProvider field tells the frontend which flow to enter:
 *   "stripe"  → stripeClientSecret is set; render Stripe Elements modal
 *   "payway"  → paywayTranId + QR fields are set; redirect or show QR
 *
 * PayWay may return either:
 *   A) A hosted checkout URL (checkoutUrl) — redirect the user there.
 *   B) QR data (qrImage / qrString) — display the QR code inline for ABA Pay / KHQR.
 *
 * After PayWay payment, call POST /api/tickets/verify/{paywayTranId} to issue the ticket.
 * For Stripe, the ticket is issued automatically via the payment_intent.succeeded webhook.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {

    private UUID transactionId;

    /** "stripe" or "payway" — frontend uses this to decide which flow to enter */
    private String paymentProvider;

    // ---- Stripe fields (set when paymentProvider == "stripe") ----

    /**
     * Stripe PaymentIntent clientSecret — passed to Stripe Elements on the frontend.
     * Used to confirm the payment client-side via stripe.confirmPayment().
     * Never stored in the database.
     */
    private String stripeClientSecret;

    // ---- PayWay fields (set when paymentProvider == "payway") ----

    /** PayWay's own transaction ID — used in the POST /api/tickets/verify/{paywayTranId} step */
    private String paywayTranId;

    /** Hosted checkout page URL — redirect the user here if present */
    private String checkoutUrl;

    /** Base64 PNG data URL — render as <img src={qrImage} /> for ABA Pay / KHQR */
    private String qrImage;

    /** Raw KHQR string — use to render QR client-side if preferred over qrImage */
    private String qrString;

    /** Deep link that opens ABA mobile banking directly on mobile */
    private String abapayDeeplink;

    // ---- Common ----

    /** Amount charged in cents (e.g. 500 = $5.00). Divide by 100 to display. */
    private Long amountInCents;
}
