package com.anicon.backend.ticketing.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionResponse {

    private UUID id;
    private UUID eventId;
    private UUID userId;

    private String paywayTranId;

    /**
     * Amount in cents (e.g. 500 = $5.00 USD).
     * Divide by 100 to display on the frontend.
     */
    private Long amount;

    /** "card", "aba_pay", "khqr", "wechat", or "alipay" */
    private String paymentMethod;

    /** "pending", "paid", "failed", or "cancelled" */
    private String paymentStatus;

    private OffsetDateTime createdAt;

    /** Set when paymentStatus becomes "paid" */
    private OffsetDateTime paidAt;
}
