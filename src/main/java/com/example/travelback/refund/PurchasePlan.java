package com.example.travelback.refund;

import java.math.BigDecimal;
import java.util.List;

/**
 * 구매 전 비교 결과 (R54). 대상이 아니면 rows는 비고 shortBy에 더 사야 할 금액(€)이 있다.
 * savingMessage는 절약액이 0일 때만 있다.
 */
public record PurchasePlan(
        boolean eligible,
        BigDecimal shortBy,
        List<PlanRow> rows,
        PlanRow baseline,
        long saving,
        String savingMessage) {
}
