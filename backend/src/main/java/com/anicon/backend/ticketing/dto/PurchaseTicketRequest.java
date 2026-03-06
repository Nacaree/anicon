package com.anicon.backend.ticketing.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PurchaseTicketRequest {

    /** One of: "card", "aba_pay", "khqr", "wechat", "alipay" */
    @NotBlank
    private String paymentMethod;

    /** Number of tickets to purchase in one transaction. Defaults to 1. */
    @Min(1) @Max(20)
    private int quantity = 1;
}
