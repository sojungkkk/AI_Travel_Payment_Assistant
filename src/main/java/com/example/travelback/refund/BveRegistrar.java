package com.example.travelback.refund;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.Money;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;

/** BVE 검증 · 예정 원화 (R52). 환급 예정액 상한은 합계에 포함된 VAT 전액(합계 × 20 ÷ 120)이다. */
public class BveRegistrar {

    private static final int MAX_TEXT = 40;
    private static final BigDecimal MIN_AMOUNT = new BigDecimal("0.01");
    private static final BigDecimal VAT_SHARE = new BigDecimal("20");
    private static final BigDecimal VAT_BASE = new BigDecimal("120");

    public RegisteredBve register(LocalDate groupStart, BigDecimal groupAmount, PaymentMethod groupMethod,
            Bve input, BigDecimal rate) {
        String operator = input.operator() == null ? "" : input.operator().strip();
        if (operator.isEmpty() || operator.length() > MAX_TEXT || input.method() == null) {
            throw new DomainException(ErrorCode.INVALID_BVE);
        }
        String number = input.number() == null || input.number().isBlank() ? null : input.number().strip();
        if (number != null && number.length() > MAX_TEXT) {
            throw new DomainException(ErrorCode.INVALID_BVE);
        }
        if (input.issuedOn() == null || input.issuedOn().isBefore(groupStart)) {
            throw new DomainException(ErrorCode.INVALID_BVE_DATE);
        }
        BigDecimal amount = input.amount() == null ? null : Money.round2(input.amount());
        BigDecimal cap = groupAmount.multiply(VAT_SHARE).divide(VAT_BASE, 2, RoundingMode.HALF_UP);
        if (amount == null || amount.compareTo(MIN_AMOUNT) < 0 || amount.compareTo(cap) > 0) {
            throw new DomainException(ErrorCode.INVALID_REFUND_AMOUNT);
        }
        Bve bve = new Bve(operator, number, input.issuedOn(), input.pablo(), input.method(), amount);
        return new RegisteredBve(bve, expectedKRW(groupAmount, groupMethod, input.method(), amount, rate));
    }

    /**
     * 예정 원화. store는 R8(합계) − R8(합계 − 예정액), 나머지는 round(예정액 × 기준환율 × 환율 계수).
     * 결제 수단이 섞인 묶음(null)의 store는 가산율 없는 travel로 계산한다.
     */
    public long expectedKRW(BigDecimal groupAmount, PaymentMethod groupMethod, RefundOptionId method,
            BigDecimal amount, BigDecimal rate) {
        PaymentMethod payment = groupMethod == null ? PaymentMethod.TRAVEL : groupMethod;
        return CombinationCalculator.refundKRW(groupAmount, payment, new RefundOption(method, amount), rate);
    }
}
