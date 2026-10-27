package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;

/** vatNumber는 정규화된 값이거나 없음(null)이다 (R24). */
public record Receipt(
        String store,
        LocalDate date,
        BigDecimal amount,
        PaymentMethod method,
        String vatNumber,
        boolean eligible,
        boolean instant,
        boolean city) {
}
