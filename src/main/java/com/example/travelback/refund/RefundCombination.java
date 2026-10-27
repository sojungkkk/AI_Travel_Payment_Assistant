package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;

/** 결제 수단 × 환급 옵션 한 행: 결제 원화 · 환급 원화 · 실지출액 · 선환급 청구 예상액 (R30, R31). */
public record RefundCombination(
        PaymentMethod method,
        RefundOptionId option,
        long gross,
        long refundKRW,
        long net,
        long penaltyKRW) {
}
