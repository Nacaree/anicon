package com.anicon.backend.ticketing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Returned when a user initiates a ticket purchase for a paid event.
 *
 * PayWay may return either:
 *   A) A hosted checkout URL (checkoutUrl) — redirect the user there.
 *   B) QR data (qrImage / qrString) — display the QR code inline for ABA Pay / KHQR.
 *
 * After payment, call POST /api/tickets/verify/{paywayTranId} to issue the ticket.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {

    private UUID transactionId;

    /** PayWay's own transaction ID — used in the verify step */
    private String paywayTranId;

    /** Amount charged in cents (e.g. 500 = $5.00). Divide by 100 to display. */
    private Long amountInCents;

    /** Hosted checkout page URL — redirect the user here if present */
    private String checkoutUrl;

    /** Base64 PNG data URL — render as <img src={qrImage} /> for ABA Pay / KHQR */
    private String qrImage;

    /** Raw KHQR string — use to render QR client-side if preferred over qrImage */
    private String qrString;

    /** Deep link that opens ABA mobile banking directly on mobile */
    private String abapayDeeplink;
}
