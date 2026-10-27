package com.example.travelback.refund;

import java.math.BigDecimal;

/** 시연 환급률로 계산한 추정 환급액(€) (R29). */
public record RefundOption(RefundOptionId id, BigDecimal refund) {
}
