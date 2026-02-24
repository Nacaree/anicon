package com.anicon.backend.ticketing;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import kong.unirest.core.HttpResponse;
import kong.unirest.core.Unirest;

/**
 * PayWay payment gateway integration (ABA Bank, Cambodia).
 *
 * Sandbox base URL: https://checkout-sandbox.payway.com.kh
 * Production base URL: https://checkout.payway.com.kh
 *
 * Two API calls:
 *   1. Purchase API          — POST multipart/form-data, returns checkout_qr_url
 *   2. Check Transaction API — POST JSON, returns payment_status_code
 *
 * Both calls require a HMAC-SHA512 hash (Base64-encoded) of concatenated
 * parameters using the merchant API key as the secret.
 */
@Service
public class PayWayService {

    private static final Logger log = LoggerFactory.getLogger(PayWayService.class);

    // Switch to the production URL before going live
    private static final String PURCHASE_URL =
            "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/purchase";
    private static final String CHECK_TRANSACTION_URL =
            "https://checkout-sandbox.payway.com.kh/api/payment-gateway/v1/payments/check-transaction-2";

    private static final DateTimeFormatter REQ_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final ObjectMapper objectMapper;

    @Value("${payway.merchant-id}")
    private String merchantId;

    // API key from the ABA PayWay sandbox merchant dashboard.
    // This is the HMAC secret — do not confuse with the RSA keys or merchant password.
    @Value("${payway.api-key}")
    private String apiKey;

    /** Set payway.mock-approved=true in .env to skip real PayWay verification (testing only). */
    @Value("${payway.mock-approved:false}")
    private boolean mockApproved;

    public PayWayService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Holds the result of a successful PayWay purchase initiation.
     *
     * @param tranId         The tran_id we generated and sent to PayWay.
     *                       Stored in transactions.payway_tran_id — used for verification later.
     * @param checkoutUrl    checkout_qr_url if PayWay returned a hosted checkout page (may be null).
     * @param qrImage        Base64 PNG data URL for the KHQR/ABA Pay QR code (may be null).
     * @param qrString       Raw KHQR string for rendering the QR code client-side (may be null).
     * @param abapayDeeplink Deep link URL to open ABA mobile banking app directly (may be null).
     */
    public record PurchaseResult(
            String tranId,
            String checkoutUrl,
            String qrImage,
            String qrString,
            String abapayDeeplink) {}

    /**
     * Holds the result of a PayWay payment verification.
     *
     * @param approved     true if payment_status_code == 0 (APPROVED or PRE-AUTH)
     * @param approvalCode The APV code returned by PayWay on approval.
     * @param rawResponse  Full PayWay JSON response string for audit trail.
     */
    public record VerifyResult(boolean approved, String approvalCode, String rawResponse) {}

    /**
     * Initiates a payment session with PayWay (Purchase API).
     *
     * Flow:
     *   1. We generate a unique tran_id (max 20 chars)
     *   2. POST multipart/form-data to PayWay Purchase API
     *   3. PayWay returns checkout_qr_url — redirect the user there
     *   4. After payment, PayWay redirects user to return_url
     *   5. Frontend calls POST /api/tickets/verify/{tranId} to confirm
     *
     * @param eventId       For logging/tracing (not sent to PayWay directly)
     * @param userId        For logging/tracing (not sent to PayWay directly)
     * @param amountInCents Amount in cents (e.g. 500 = $5.00) — converted to dollars for PayWay
     * @param paymentMethod Our internal enum value — mapped to PayWay payment_option naming
     * @param returnUrl     Where PayWay redirects after checkout — Base64-encoded per PayWay docs
     */
    public PurchaseResult initiatePayment(
            UUID eventId,
            UUID userId,
            long amountInCents,
            String paymentMethod,
            String returnUrl) {

        String reqTime = currentReqTime();

        // tran_id: generated by us, max 20 chars, must be unique per transaction.
        // Format: "T" + 13-digit epoch milliseconds = 14 chars total.
        String tranId = "T" + System.currentTimeMillis();

        // PayWay expects dollars with 2 decimal places (e.g. "5.00"), not cents.
        String amount = centsToAmount(amountInCents);

        // PayWay payment_option naming differs from our internal enum values:
        //   "card"          → "cards"
        //   "aba_pay"       → "abapay_khqr"
        //   "khqr"          → "abapay_khqr"
        //   "wechat"        → "wechat"
        //   "alipay"        → "alipay"
        String paymentOption = mapPaymentOption(paymentMethod);

        // PayWay requires return_url to be Base64-encoded in the form field,
        // but the hash must use the original (non-encoded) URL.
        String encodedReturnUrl = Base64.getEncoder()
                .encodeToString(returnUrl.getBytes(StandardCharsets.UTF_8));

        // AniCon only supports USD — required by PayWay as a form field and in the hash.
        String currency = "USD";

        // Hash input: req_time + merchant_id + tran_id + amount + payment_option + return_url_base64 + currency
        // Null/unused optional fields (firstname, lastname, email, phone, etc.) are omitted entirely.
        // return_url must be base64-encoded in the hash — same value sent in the form field.
        // Source: payway-js (seanghay/payway-js) — confirmed field order and return_url encoding.
        String hashInput = reqTime + merchantId + tranId + amount + paymentOption + encodedReturnUrl + currency;
        String hash = generateHash(hashInput);

        log.debug("[PayWay] req_time={} tran_id={} amount={} payment_option={} currency={}", reqTime, tranId, amount, paymentOption, currency);
        log.debug("[PayWay] merchantId length={} apiKey length={}", merchantId.length(), apiKey.length());
        log.debug("[PayWay] hashInput={}", hashInput);

        HttpResponse<String> response = Unirest.post(PURCHASE_URL)
                .field("req_time", reqTime)
                .field("merchant_id", merchantId)
                .field("tran_id", tranId)
                .field("amount", amount)
                .field("currency", currency)
                .field("payment_option", paymentOption)
                .field("return_url", encodedReturnUrl)
                .field("hash", hash)
                .asString();

        log.debug("[PayWay] raw response: {}", response.getBody());

        Map<String, Object> body = parseJson(response.getBody());

        @SuppressWarnings("unchecked")
        Map<String, Object> status = (Map<String, Object>) body.get("status");
        if (status == null || !"00".equals(status.get("code"))) {
            String message = status != null ? (String) status.get("message") : "Unknown error";
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayWay purchase failed: " + message);
        }

        // PayWay may return either a hosted checkout page URL (checkout_qr_url)
        // or raw QR data (qrImage / qrString) for ABA Pay / KHQR flow.
        String checkoutUrl = (String) body.get("checkout_qr_url");
        String qrImage = (String) body.get("qrImage");
        String qrString = (String) body.get("qrString");
        String abapayDeeplink = (String) body.get("abapay_deeplink");

        if (checkoutUrl == null && qrImage == null && qrString == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "PayWay returned no checkout data");
        }

        return new PurchaseResult(tranId, checkoutUrl, qrImage, qrString, abapayDeeplink);
    }

    /**
     * Verifies a completed payment with PayWay (Check Transaction API).
     *
     * Called after PayWay redirects the user back to our return_url.
     * payment_status_code == 0 means APPROVED (or PRE-AUTH).
     *
     * Status codes:
     *   0 = APPROVED / PRE-AUTH
     *   2 = PENDING
     *   3 = DECLINED
     *   4 = REFUNDED
     *   7 = CANCELLED
     *
     * @param tranId The tran_id we generated during initiatePayment
     * @return VerifyResult with approval status, APV code, and full raw response for audit trail
     */
    public VerifyResult verifyPayment(String tranId) {
        if (mockApproved) {
            log.warn("[PayWay] mock-approved=true — skipping real verification for tran_id={}", tranId);
            return new VerifyResult(true, "MOCK-APV", "{\"mock\":true}");
        }

        String reqTime = currentReqTime();

        // Hash input for Check Transaction API: req_time + merchant_id + tran_id
        String hash = generateHash(reqTime + merchantId + tranId);

        String requestBody;
        try {
            requestBody = objectMapper.writeValueAsString(Map.of(
                    "req_time", reqTime,
                    "merchant_id", merchantId,
                    "tran_id", tranId,
                    "hash", hash
            ));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize PayWay check-transaction request", e);
        }

        HttpResponse<String> response = Unirest.post(CHECK_TRANSACTION_URL)
                .contentType("application/json")
                .body(requestBody)
                .asString();

        String rawResponse = response.getBody() != null ? response.getBody() : "{}";
        Map<String, Object> body = parseJson(rawResponse);

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.get("data");
        if (data == null) {
            return new VerifyResult(false, null, rawResponse);
        }

        // payment_status_code == 0 means APPROVED or PRE-AUTH
        Object codeObj = data.get("payment_status_code");
        boolean approved = codeObj instanceof Number && ((Number) codeObj).intValue() == 0;

        // APV (approval code) — stored in transactions.payway_approval_code
        String approvalCode = (String) data.get("apv");

        return new VerifyResult(approved, approvalCode, rawResponse);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /** Returns current UTC time formatted as YYYYMMDDHHmmss, as required by PayWay. */
    private String currentReqTime() {
        return ZonedDateTime.now(ZoneOffset.UTC).format(REQ_TIME_FORMAT);
    }

    /** Converts cents to a dollar amount string with 2 decimal places (e.g. 500 → "5.00"). */
    private String centsToAmount(long amountInCents) {
        return BigDecimal.valueOf(amountInCents)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                .toPlainString();
    }

    /**
     * Generates HMAC-SHA512 hash of the given data string, Base64-encoded.
     * Uses the PayWay API key as the HMAC secret.
     */
    private String generateHash(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            SecretKeySpec keySpec = new SecretKeySpec(
                    apiKey.strip().getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            mac.init(keySpec);
            byte[] rawHash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(rawHash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to generate PayWay HMAC-SHA512 hash", e);
        }
    }

    /** Maps our internal payment method enum values to PayWay's payment_option field names. */
    private String mapPaymentOption(String method) {
        return switch (method) {
            case "card"             -> "cards";
            case "aba_pay", "khqr" -> "abapay_khqr";
            case "wechat"           -> "wechat";
            case "alipay"           -> "alipay";
            default                 -> "cards";
        };
    }

    /** Parses a JSON string into a Map, returning an empty map on failure. */
    private Map<String, Object> parseJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
