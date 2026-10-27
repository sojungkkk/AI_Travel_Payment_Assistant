package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CombinationCalculatorTest {

    private static final BigDecimal RATE = new BigDecimal("1580");
    private static final BigDecimal AMOUNT = new BigDecimal("420");

    private final RefundOptionPolicy policy = new RefundOptionPolicy();
    private final CombinationCalculator calculator = new CombinationCalculator();

    private List<RefundCombination> 기본묶음(boolean instant, boolean city) {
        return calculator.combine(AMOUNT, policy.options(AMOUNT, instant, city), RATE);
    }

    private List<RefundCombination> 기본묶음() {
        return 기본묶음(true, true);
    }

    private void assertRank(int rank, PaymentMethod method, RefundOptionId option, long gross, long refund, long net) {
        RefundCombination row = 기본묶음().get(rank - 1);
        assertEquals(method, row.method());
        assertEquals(option, row.option());
        assertEquals(gross, row.gross());
        assertEquals(refund, row.refundKRW());
        assertEquals(net, row.net());
    }

    private RefundCombination row(PaymentMethod method, RefundOptionId option) {
        return 기본묶음().stream().filter(r -> r.method() == method && r.option() == option).findFirst().orElseThrow();
    }

    @Test
    void 조합_1위는_트래블_공항카드_584366원이다() {
        assertRank(1, PaymentMethod.TRAVEL, RefundOptionId.AIRPORT_CARD, 663_600, 79_234, 584_366);
    }

    @Test
    void 조합_2위는_일반_공항카드_592993원이다() {
        assertRank(2, PaymentMethod.STANDARD, RefundOptionId.AIRPORT_CARD, 672_227, 79_234, 592_993);
    }

    @Test
    void 조합_3위는_트래블_시내_594113원이다() {
        assertRank(3, PaymentMethod.TRAVEL, RefundOptionId.CITY, 663_600, 69_487, 594_113);
    }

    @Test
    void 조합_4위는_트래블_매장_597240원이다() {
        assertRank(4, PaymentMethod.TRAVEL, RefundOptionId.STORE, 663_600, 66_360, 597_240);
    }

    @Test
    void 조합_5위는_현금_공항카드_597638원이다() {
        assertRank(5, PaymentMethod.CASH, RefundOptionId.AIRPORT_CARD, 676_872, 79_234, 597_638);
    }

    @Test
    void 조합_6위는_트래블_공항현금_599961원이다() {
        assertRank(6, PaymentMethod.TRAVEL, RefundOptionId.AIRPORT_CASH, 663_600, 63_639, 599_961);
    }

    @Test
    void 조합_7위는_일반_시내_602740원이다() {
        assertRank(7, PaymentMethod.STANDARD, RefundOptionId.CITY, 672_227, 69_487, 602_740);
    }

    @Test
    void 조합_8위는_일반_매장_605004원이다() {
        assertRank(8, PaymentMethod.STANDARD, RefundOptionId.STORE, 672_227, 67_223, 605_004);
    }

    @Test
    void 조합_9위는_현금_시내_607385원이다() {
        assertRank(9, PaymentMethod.CASH, RefundOptionId.CITY, 676_872, 69_487, 607_385);
    }

    @Test
    void 조합_10위는_일반_공항현금_608588원이다() {
        assertRank(10, PaymentMethod.STANDARD, RefundOptionId.AIRPORT_CASH, 672_227, 63_639, 608_588);
    }

    @Test
    void 조합_11위는_현금_매장_609185원이다() {
        assertRank(11, PaymentMethod.CASH, RefundOptionId.STORE, 676_872, 67_687, 609_185);
    }

    @Test
    void 조합_12위는_현금_공항현금_613233원이다() {
        assertRank(12, PaymentMethod.CASH, RefundOptionId.AIRPORT_CASH, 676_872, 63_639, 613_233);
    }

    @Test
    void 조합_최고와_최저_차액은_28867원이다() {
        assertEquals(28_867, calculator.spread(기본묶음()));
    }

    @Test
    void 조합_시내를_지원하지_않으면_9행이다() {
        assertEquals(9, 기본묶음(true, false).size());
    }

    @Test
    void 조합_즉시와_시내를_모두_지원하지_않으면_6행이다() {
        assertEquals(6, 기본묶음(false, false).size());
    }

    @Test
    void 청구예상액_트래블_매장은_76314원이다() {
        assertEquals(76_314, row(PaymentMethod.TRAVEL, RefundOptionId.STORE).penaltyKRW());
    }

    @Test
    void 청구예상액_트래블_시내는_79910원이다() {
        assertEquals(79_910, row(PaymentMethod.TRAVEL, RefundOptionId.CITY).penaltyKRW());
    }

    @Test
    void 청구예상액_공항옵션은_0원이다() {
        for (PaymentMethod method : PaymentMethod.values()) {
            assertEquals(0, row(method, RefundOptionId.AIRPORT_CARD).penaltyKRW());
            assertEquals(0, row(method, RefundOptionId.AIRPORT_CASH).penaltyKRW());
        }
    }

    @Test
    void 조합_등록묶음_travel이면_travel_4행만_보인다() {
        List<RefundCombination> visible = calculator.visible(PaymentMethod.TRAVEL, 기본묶음());

        assertEquals(4, visible.size());
        assertEquals(RefundOptionId.AIRPORT_CARD, visible.get(0).option());
        assertEquals(584_366, visible.get(0).net());
        assertEquals(12, calculator.visible(null, 기본묶음()).size());
    }

    @Test
    void 조합_BVE가_있으면_확인된_1행만_보인다() {
        RefundCombination confirmed = calculator.confirmed(AMOUNT, PaymentMethod.TRAVEL,
                RefundOptionId.AIRPORT_CARD, 79_234, RATE);

        assertEquals(663_600, confirmed.gross());
        assertEquals(79_234, confirmed.refundKRW());
        assertEquals(584_366, confirmed.net());
        assertEquals(0, confirmed.penaltyKRW());
    }
}
