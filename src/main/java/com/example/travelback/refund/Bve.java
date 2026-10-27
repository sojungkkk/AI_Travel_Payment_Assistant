package com.example.travelback.refund;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 매장에서 받은 환급 서류(BVE). number는 없을 수 있다 (R52). */
public record Bve(
        String operator,
        String number,
        LocalDate issuedOn,
        boolean pablo,
        RefundOptionId method,
        BigDecimal amount) {
}
