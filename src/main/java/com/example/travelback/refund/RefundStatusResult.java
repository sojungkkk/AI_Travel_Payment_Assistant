package com.example.travelback.refund;

import java.time.LocalDate;

/** 상태 · 덧붙일 안내(없으면 null) · 선환급 청구 예상액(없으면 0) · 실제 기한 (R53). */
public record RefundStatusResult(RefundStatus status, String note, long penaltyKRW, LocalDate effectiveDeadline) {
}
