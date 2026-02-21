package com.anicon.backend.ticketing;

import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Stub for the PayWay payment gateway integration.
 *
 * PayWay is a Cambodian payment gateway used for processing card, ABA Pay,
 * KHQR, WeChat Pay, and Alipay transactions.
 *
 * TODO: Fill in actual PayWay API credentials and HTTP calls when integrating.
 *       Required config: merchant ID, API key, return URL
 *
 * Two API calls are needed:
 *   1. Purchase API          — initiates a payment session, returns a checkout URL
 *   2. Check Transaction API — verifies payment status after user completes checkout
 */
@Service
public class PayWayService {

    /**
     * Holds the result of a PayWay purchase initiation.
     *
     * @param paywayTranId  Unique transaction ID assigned by PayWay.
     *                      Stored in the transactions table and used to verify later.
     * @param checkoutUrl   URL to redirect the user to for completing payment.
     */
    public record PurchaseResult(String paywayTranId, String checkoutUrl) {}

    /**
     * Initiates a payment with PayWay (Purchase API).
     *
     * Real implementation should POST to the PayWay Purchase API and return
     * the checkout URL where the user enters their payment details.
     * After the user pays, PayWay redirects to returnUrl with the tran_id.
     *
     * @param eventId       Used to build a reference in the PayWay request
     * @param userId        Identifies the buyer
     * @param amountInCents Amount in cents (e.g. 500 = $5.00 USD)
     * @param paymentMethod e.g. "card", "aba_pay", "khqr"
     * @param returnUrl     URL PayWay redirects to after payment is completed
     */
    public PurchaseResult initiatePayment(
            UUID eventId,
            UUID userId,
            long amountInCents,
            String paymentMethod,
            String returnUrl) {

        // TODO: Replace with real PayWay Purchase API call
        String stubTranId = "PAYWAY-STUB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String stubCheckoutUrl = "https://checkout.payway.com.kh/stub?tran_id=" + stubTranId;
        return new PurchaseResult(stubTranId, stubCheckoutUrl);
    }

    /**
     * Verifies a completed payment with PayWay (Check Transaction API).
     *
     * Real implementation should POST the tran_id to the Check Transaction API.
     * PayWay returns payment_status_code = 0 for success, anything else = failed/pending.
     *
     * @param paywayTranId The transaction ID from initiatePayment
     * @return true if PayWay confirms payment was successful
     */
    public boolean verifyPayment(String paywayTranId) {
        // TODO: Replace with real PayWay Check Transaction API call
        return true;
    }
}
