package com.anicon.backend.ticketing.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PurchaseTicketRequest {

    /** One of: "card", "aba_pay", "khqr", "wechat", "alipay" */
    @NotBlank
    private String paymentMethod;
}
