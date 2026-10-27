package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 하나의 구매로 합산한 영수증 묶음 (R26).
 * method가 null이면 결제 수단이 섞인 mixed 묶음이다. receiptIndexes는 입력 목록에서의 위치다.
 */
public record ReceiptGroup(
        String key,
        String store,
        String vatNumber,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal amount,
        List<Integer> receiptIndexes,
        boolean eligible,
        boolean instant,
        boolean city,
        PaymentMethod method) {

    public boolean mixed() {
        return method == null;
    }

    public boolean multiDay() {
        return !startDate.equals(endDate);
    }
}
