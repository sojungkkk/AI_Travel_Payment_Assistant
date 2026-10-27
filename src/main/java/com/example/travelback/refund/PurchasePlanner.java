package com.example.travelback.refund;

import com.example.travelback.common.CardType;
import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.Money;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.util.List;

/**
 * 구매 전 비교 (R54). 3수단 × 지원 옵션을 R31 · R32로 계산하고, 최저 대비 차이와 기본 선택 대비 절약액을 붙인다.
 * 최저는 배지일 뿐 선택을 강제하지 않는다.
 */
public class PurchasePlanner {

    private static final BigDecimal MIN = new BigDecimal("0.01");
    private static final BigDecimal MAX = new BigDecimal("1000000");
    private static final BigDecimal THRESHOLD = new BigDecimal("100");
    private static final BigDecimal ELIGIBLE_FROM = new BigDecimal("100.01");

    private final RefundOptionPolicy policy = new RefundOptionPolicy();
    private final CombinationCalculator calculator = new CombinationCalculator();

    public PurchasePlan plan(BigDecimal amount, CardType card, Support instant, Support city, BigDecimal rate) {
        if (amount == null || amount.compareTo(MIN) < 0 || amount.compareTo(MAX) > 0) {
            throw new DomainException(ErrorCode.INVALID_AMOUNT);
        }
        if (amount.compareTo(THRESHOLD) <= 0) {
            return new PurchasePlan(false, Money.round2(ELIGIBLE_FROM.subtract(amount)), List.of(), null, 0, null);
        }
        List<RefundOption> options = policy.options(amount, instant != Support.NO, city != Support.NO);
        List<RefundCombination> combos = calculator.combine(amount, options, rate);
        RefundCombination lowest = combos.stream()
                .filter(c -> !unknown(c.option(), instant, city))
                .findFirst().orElseThrow();
        List<PlanRow> rows = combos.stream()
                .map(c -> new PlanRow(c.method(), c.option(), c.gross(), c.refundKRW(), c.net(),
                        c.net() - lowest.net(), c == lowest, unknown(c.option(), instant, city)))
                .toList();
        PaymentMethod base = card.paymentMethod();
        PlanRow baseline = rows.stream()
                .filter(r -> r.method() == base && r.option() == RefundOptionId.AIRPORT_CARD)
                .findFirst().orElseThrow();
        long saving = baseline.net() - lowest.net();
        return new PurchasePlan(true, null, rows, baseline, saving, saving == 0 ? "지금 계획이 이미 최저예요" : null);
    }

    private static boolean unknown(RefundOptionId option, Support instant, Support city) {
        return (option == RefundOptionId.STORE && instant == Support.UNKNOWN)
                || (option == RefundOptionId.CITY && city == Support.UNKNOWN);
    }
}
