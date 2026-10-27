package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RefundStatusPolicyTest {

    private static final LocalDate START = LocalDate.of(2026, 11, 12);
    private static final ReceiptGroup GROUP = new ReceiptGroup("파리 백화점|2026-11-12", "파리 백화점", null,
            START, START, new BigDecimal("420.00"), List.of(0), true, true, true, PaymentMethod.TRAVEL);
    private static final Bve CARD = new Bve("Global Blue", null, START, true, RefundOptionId.AIRPORT_CARD,
            new BigDecimal("50.40"));
    private static final Bve STORE = new Bve("매장 직접", null, START, true, RefundOptionId.STORE,
            new BigDecimal("42.00"));

    private final RefundStatusPolicy policy = new RefundStatusPolicy();

    private static LocalDate d(int year, int month, int day) {
        return LocalDate.of(year, month, day);
    }

    private RefundStatusResult 판정(Bve bve, long bveKRW, LocalDate confirmedOn, boolean received, LocalDate today) {
        return policy.evaluate(GROUP, true, bve, bveKRW, confirmedOn, received, today);
    }

    @Test
    void 상태_BVE없으면_서류미발급이다() {
        RefundStatusResult r = 판정(null, 0, null, false, d(2026, 11, 20));

        assertEquals(RefundStatus.DOCS_MISSING, r.status());
        assertEquals(d(2027, 2, 28), r.effectiveDeadline());
    }

    @Test
    void 상태_BVE있고_미확인이면_세관확인필요다() {
        assertEquals(RefundStatus.CUSTOMS_NEEDED, 판정(CARD, 79_234, null, false, d(2026, 11, 20)).status());
    }

    @Test
    void 상태_기한지나고_미확인이면_기한만료다() {
        RefundStatusResult r = 판정(CARD, 79_234, null, false, d(2027, 3, 1));

        assertEquals(RefundStatus.EXPIRED, r.status());
        assertTrue(r.note().contains("환급 불가"));
        assertEquals(0, r.penaltyKRW());
    }

    @Test
    void 상태_확인후_42일째는_환급대기이고_43일째는_입금지연이다() {
        assertEquals(RefundStatus.WAITING, 판정(CARD, 79_234, d(2026, 11, 25), false, d(2027, 1, 6)).status());

        RefundStatusResult r = 판정(CARD, 79_234, d(2026, 11, 25), false, d(2027, 1, 7));
        assertEquals(RefundStatus.DELAYED, r.status());
        assertTrue(r.note().contains("환급사업자에 문의"));
    }

    @Test
    void 상태_발행6개월_지나면_처리기한지남을_덧붙인다() {
        RefundStatusResult r = 판정(CARD, 79_234, d(2026, 11, 25), false, d(2027, 5, 13));

        assertEquals(RefundStatus.DELAYED, r.status());
        assertTrue(r.note().contains("사업자 처리 기한 지남, 바로 문의"));
        assertTrue(!판정(CARD, 79_234, d(2026, 11, 25), false, d(2027, 5, 12)).note().contains("처리 기한 지남"));
    }

    @Test
    void 상태_수령기록이_있으면_완료다() {
        assertEquals(RefundStatus.COMPLETED, 판정(CARD, 79_234, d(2026, 11, 25), true, d(2027, 1, 20)).status());
    }

    @Test
    void 상태_매장선환급_반송기한지나면_기한만료와_청구예상액이다() {
        RefundStatusResult r = 판정(STORE, 66_360, null, false, d(2026, 12, 4));

        assertEquals(RefundStatus.EXPIRED, r.status());
        assertEquals(d(2026, 12, 3), r.effectiveDeadline());
        assertEquals(76_314, r.penaltyKRW());
    }

    @Test
    void 상태_매장선환급_확인되면_완료다() {
        assertEquals(RefundStatus.COMPLETED, 판정(STORE, 66_360, d(2026, 11, 20), false, d(2026, 11, 30)).status());
    }

    @Test
    void 상태_확인일이_발행일보다_앞서거나_오늘보다_뒤면_INVALID_CONFIRM_DATE다() {
        DomainException before = assertThrows(DomainException.class,
                () -> 판정(CARD, 79_234, d(2026, 11, 11), false, d(2026, 11, 30)));
        DomainException future = assertThrows(DomainException.class,
                () -> 판정(CARD, 79_234, d(2026, 12, 1), false, d(2026, 11, 30)));

        assertEquals(ErrorCode.INVALID_CONFIRM_DATE, before.errorCode());
        assertEquals(ErrorCode.INVALID_CONFIRM_DATE, future.errorCode());
    }

    @Test
    void 상태_100유로_묶음은_해당없음이다() {
        RefundStatusResult r = policy.evaluate(GROUP, false, null, 0, null, false, d(2026, 11, 20));

        assertEquals(RefundStatus.NOT_APPLICABLE, r.status());
        assertNull(r.note());
    }
}
