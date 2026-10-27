package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class BveRegistrarTest {

    private static final BigDecimal RATE = new BigDecimal("1580");
    private static final LocalDate START = LocalDate.of(2026, 11, 12);

    private final BveRegistrar registrar = new BveRegistrar();

    private static Bve bve(String operator, LocalDate issuedOn, RefundOptionId method, String amount) {
        return new Bve(operator, "GB-0001", issuedOn, true, method, new BigDecimal(amount));
    }

    private RegisteredBve 등록(String total, String amount) {
        return registrar.register(START, new BigDecimal(total), PaymentMethod.TRAVEL,
                bve("Global Blue", START, RefundOptionId.AIRPORT_CARD, amount), RATE);
    }

    private ErrorCode 오류(Runnable action) {
        return assertThrows(DomainException.class, action::run).errorCode();
    }

    @Test
    void BVE_공항카드_50점4유로는_79234원이다() {
        RegisteredBve registered = 등록("420", "50.4");

        assertEquals(79_234, registered.expectedKRW());
        assertEquals(new BigDecimal("50.40"), registered.bve().amount());
    }

    @Test
    void BVE_매장즉시환급은_결제금액_차감방식으로_계산한다() {
        RegisteredBve registered = registrar.register(START, new BigDecimal("420"), PaymentMethod.TRAVEL,
                bve("매장 직접", START, RefundOptionId.STORE, "42"), RATE);

        assertEquals(66_360, registered.expectedKRW());
    }

    @Test
    void BVE_예정액_상한은_합계의_20나누기120이다() {
        assertEquals(new BigDecimal("70.00"), 등록("420", "70").bve().amount());
        assertEquals(ErrorCode.INVALID_REFUND_AMOUNT, 오류(() -> 등록("420", "70.01")));
        assertEquals(new BigDecimal("18.38"), 등록("110.3", "18.38").bve().amount());
        assertEquals(ErrorCode.INVALID_REFUND_AMOUNT, 오류(() -> 등록("110.3", "18.39")));
        assertEquals(ErrorCode.INVALID_REFUND_AMOUNT, 오류(() -> 등록("420", "0")));
    }

    @Test
    void BVE_발행일이_시작일보다_앞서면_INVALID_BVE_DATE다() {
        assertEquals(ErrorCode.INVALID_BVE_DATE, 오류(() -> registrar.register(START, new BigDecimal("420"),
                PaymentMethod.TRAVEL, bve("Planet", START.minusDays(1), RefundOptionId.AIRPORT_CARD, "50"), RATE)));
    }

    @Test
    void BVE_사업자가_비면_INVALID_BVE다() {
        assertEquals(ErrorCode.INVALID_BVE, 오류(() -> registrar.register(START, new BigDecimal("420"),
                PaymentMethod.TRAVEL, bve("  ", START, RefundOptionId.AIRPORT_CARD, "50"), RATE)));
        assertEquals(ErrorCode.INVALID_BVE, 오류(() -> registrar.register(START, new BigDecimal("420"),
                PaymentMethod.TRAVEL, bve("x".repeat(41), START, RefundOptionId.AIRPORT_CARD, "50"), RATE)));
    }
}
