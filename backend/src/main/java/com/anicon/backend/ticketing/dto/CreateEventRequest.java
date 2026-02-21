package com.anicon.backend.ticketing.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class CreateEventRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String location;

    @NotNull
    @FutureOrPresent
    private LocalDate eventDate;

    @NotNull
    private LocalTime eventTime;

    /** "mini_event" or "normal_event" */
    @NotBlank
    private String eventType;

    /** e.g. "convention", "meetup", "workshop", "concert", "competition", "screening" */
    @NotBlank
    private String category;

    @NotNull
    private Boolean isFree;

    /** Required when isFree = false. Stored as dollars (e.g. 5.00 = $5.00 USD). */
    @Positive
    private BigDecimal ticketPrice;

    /** null = no capacity cap */
    private Integer maxCapacity;

    private String coverImageUrl;

    /** Tag names to attach, e.g. ["naruto", "cosplay"]. Tags are created if they don't exist. */
    private List<String> tags;
}
