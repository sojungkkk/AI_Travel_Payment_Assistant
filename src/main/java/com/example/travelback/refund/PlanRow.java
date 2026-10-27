package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;

/** 구매 전 비교 한 행. diff는 최저 행 대비 실지출 차이, unknown은 "현장 확인 필요" (R54). */
public record PlanRow(
        PaymentMethod method,
        RefundOptionId option,
        long gross,
        long refundKRW,
        long net,
        long diff,
        boolean lowest,
        boolean unknown) {
}
