package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.travelback.common.CardType;
import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class PurchasePlannerTest {

    private static final BigDecimal RATE = new BigDecimal("1580");

    private final PurchasePlanner planner = new PurchasePlanner();

    private PurchasePlan 비교(String amount, CardType card, Support instant, Support city) {
        return planner.plan(new BigDecimal(amount), card, instant, city, RATE);
    }

    private static PlanRow row(PurchasePlan plan, PaymentMethod method, RefundOptionId option) {
        return plan.rows().stream().filter(r -> r.method() == method && r.option() == option).findFirst().orElseThrow();
    }

    @Test
    void 구매전_행마다_최저대비_차이와_수령시점_편의메모가_나온다() {
        PurchasePlan plan = 비교("420", CardType.TRAVEL, Support.YES, Support.YES);

        PlanRow card = row(plan, PaymentMethod.TRAVEL, RefundOptionId.AIRPORT_CARD);
        assertTrue(card.lowest());
        assertEquals(584_366, card.net());
        assertEquals(0, card.diff());
        assertEquals(9_747, row(plan, PaymentMethod.TRAVEL, RefundOptionId.CITY).diff());
        assertEquals(12_874, row(plan, PaymentMethod.TRAVEL, RefundOptionId.STORE).diff());
        assertEquals(15_595, row(plan, PaymentMethod.TRAVEL, RefundOptionId.AIRPORT_CASH).diff());
        assertEquals("세관 확인 후 1~4주", RefundOptionId.AIRPORT_CARD.receiveTime());
        assertEquals("공항 환급 창구 대기 · 현금으로 바로 받음", RefundOptionId.AIRPORT_CASH.note());
        assertEquals("결제 시점", RefundOptionId.STORE.receiveTime());
        assertEquals("시내 창구 방문 · 21일 안에 세관 확인이 안 되면 카드로 청구", RefundOptionId.CITY.note());
    }

    @Test
    void 구매전_travel이면_최저가_같고_절약0원이다() {
        PurchasePlan plan = 비교("420", CardType.TRAVEL, Support.YES, Support.UNKNOWN);

        assertTrue(plan.eligible());
        assertEquals(12, plan.rows().size());
        assertEquals(PaymentMethod.TRAVEL, plan.baseline().method());
        assertEquals(0, plan.saving());
        assertEquals("지금 계획이 이미 최저예요", plan.savingMessage());
    }

    @Test
    void 구매전_standard면_travel공항카드가_최저이고_8627원_절약이다() {
        PurchasePlan plan = 비교("420", CardType.STANDARD, Support.YES, Support.NO);

        assertEquals(9, plan.rows().size());
        assertEquals(592_993, plan.baseline().net());
        assertEquals(8_627, plan.saving());
        assertNull(plan.savingMessage());
    }

    @Test
    void 구매전_카드없으면_현금기준_13272원_절약이다() {
        PurchasePlan plan = 비교("420", CardType.NONE, Support.NO, Support.NO);

        assertEquals(6, plan.rows().size());
        assertEquals(PaymentMethod.CASH, plan.baseline().method());
        assertEquals(597_638, plan.baseline().net());
        assertEquals(13_272, plan.saving());
    }

    @Test
    void 구매전_모름_옵션은_현장확인필요로_표시되고_최저에서_빠진다() {
        PurchasePlan plan = 비교("420", CardType.TRAVEL, Support.YES, Support.UNKNOWN);

        List<PlanRow> city = plan.rows().stream().filter(r -> r.option() == RefundOptionId.CITY).toList();
        assertEquals(3, city.size());
        assertTrue(city.stream().allMatch(PlanRow::unknown));
        assertTrue(city.stream().noneMatch(PlanRow::lowest));
        assertFalse(row(plan, PaymentMethod.TRAVEL, RefundOptionId.STORE).unknown());
        assertEquals(1, plan.rows().stream().filter(PlanRow::lowest).count());
    }

    @Test
    void 구매전_100유로_이하면_더살_금액을_알려준다() {
        PurchasePlan at100 = 비교("100", CardType.TRAVEL, Support.YES, Support.YES);
        PurchasePlan at80 = 비교("80", CardType.TRAVEL, Support.YES, Support.YES);

        assertFalse(at100.eligible());
        assertEquals(new BigDecimal("0.01"), at100.shortBy());
        assertTrue(at100.rows().isEmpty());
        assertEquals(new BigDecimal("20.01"), at80.shortBy());
    }

    @Test
    void 구매전_금액이_범위밖이면_INVALID_AMOUNT다() {
        DomainException zero = assertThrows(DomainException.class,
                () -> 비교("0", CardType.TRAVEL, Support.YES, Support.YES));
        DomainException over = assertThrows(DomainException.class,
                () -> 비교("1000000.01", CardType.TRAVEL, Support.YES, Support.YES));

        assertEquals(ErrorCode.INVALID_AMOUNT, zero.errorCode());
        assertEquals(ErrorCode.INVALID_AMOUNT, over.errorCode());
    }

    @Test
    void 구매전_옵션마다_매장에서_할말이_나온다() {
        assertEquals("택스리펀 서류 발급해 주세요. 환급은 카드로 받을게요.", RefundOptionId.AIRPORT_CARD.phraseKo());
        assertEquals("Tax free form, please. Cash refund at the airport.", RefundOptionId.AIRPORT_CASH.phraseEn());
        assertEquals("즉시 환급 되나요? 보증 카드 등록할게요.", RefundOptionId.STORE.phraseKo());
        assertEquals("Tax free form, please. I'll claim at the city office.", RefundOptionId.CITY.phraseEn());
    }
}
