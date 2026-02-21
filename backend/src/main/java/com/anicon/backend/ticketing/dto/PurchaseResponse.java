package com.anicon.backend.ticketing.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Returned when a user initiates a ticket purchase for a paid event.
 *
 * The frontend should:
 *   1. Store the transactionId (to poll status if needed)
 *   2. Redirect the user to checkoutUrl to complete payment on PayWay
 *   3. After PayWay redirects back, call POST /api/tickets/verify/{paywayTranId}
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

    /** Redirect the user here to complete payment on PayWay's checkout page */
    private String checkoutUrl;
}
