package com.example.travelback.refund;

import com.example.travelback.common.Money;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 결제 × 환급 조합 · 정렬 · 차액 (R31, R32)과 선환급 청구 예상액 (R30). */
public class CombinationCalculator {

    private static final BigDecimal PENALTY_FACTOR = new BigDecimal("1.15");

    private static final Comparator<RefundCombination> ORDER = Comparator
            .comparingLong(RefundCombination::net)
            .thenComparing(c -> c.option().early());

    /** travel · standard · cash 각각에 모든 옵션을 붙여 실지출액 오름차순(같으면 선환급 아닌 쪽 먼저)으로 정렬한다. */
    public List<RefundCombination> combine(BigDecimal amount, List<RefundOption> options, BigDecimal rate) {
        List<RefundCombination> rows = new ArrayList<>();
        for (PaymentMethod method : PaymentMethod.values()) {
            for (RefundOption option : options) {
                rows.add(row(amount, method, option.id(), refundKRW(amount, method, option, rate), rate));
            }
        }
        rows.sort(ORDER);
        return List.copyOf(rows);
    }

    /** BVE로 경로가 정해진 묶음의 확인된 1행 (R32, R52). */
    public RefundCombination confirmed(BigDecimal amount, PaymentMethod method, RefundOptionId option,
            long bveKRW, BigDecimal rate) {
        return row(amount, method, option, bveKRW, rate);
    }

    /** 등록한 묶음은 그 결제 수단 행만, mixed(null)면 전부 (R32). */
    public List<RefundCombination> visible(PaymentMethod groupMethod, List<RefundCombination> all) {
        if (groupMethod == null) {
            return all;
        }
        return all.stream().filter(c -> c.method() == groupMethod).toList();
    }

    public long spread(List<RefundCombination> rows) {
        if (rows.isEmpty()) {
            return 0;
        }
        return rows.get(rows.size() - 1).net() - rows.get(0).net();
    }

    private static RefundCombination row(BigDecimal amount, PaymentMethod method, RefundOptionId option,
            long refundKRW, BigDecimal rate) {
        long gross = method.cost(amount, rate);
        long penalty = option.early() ? Money.krw(BigDecimal.valueOf(refundKRW).multiply(PENALTY_FACTOR)) : 0;
        return new RefundCombination(method, option, gross, refundKRW, gross - refundKRW, penalty);
    }

    /** store는 결제 원화 − R8(차감 후 금액), 나머지는 round(환급액 × 기준환율 × 환율 계수) */
    static long refundKRW(BigDecimal amount, PaymentMethod method, RefundOption option, BigDecimal rate) {
        if (option.id() == RefundOptionId.STORE) {
            return method.cost(amount, rate) - method.cost(Money.round2(amount.subtract(option.refund())), rate);
        }
        return Money.krw(option.refund().multiply(rate).multiply(option.id().fxFactor()));
    }
}
