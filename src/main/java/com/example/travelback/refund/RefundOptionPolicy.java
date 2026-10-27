package com.example.travelback.refund;

import com.example.travelback.common.Country;
import com.example.travelback.common.Money;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/** 환급 옵션 생성 조건 · 미충족 사유 · 서류 요청 알림 (R27)과 옵션 4종 추정 환급액 (R29). */
public class RefundOptionPolicy {

    static final String ALERT = "이 매장에서 택스리펀 서류(PABLO 바코드)를 요청하세요";
    static final String MULTI_DAY_NOTE = "여러 날 구매를 서류 1장으로 묶는 것은 매장이 허용할 때만 가능하고, 같은 도시 지점끼리만 묶을 수 있어요";

    private static final BigDecimal THRESHOLD = new BigDecimal("100");

    public RefundAnalysis analyze(Country country, ReceiptGroup group, boolean bveRegistered) {
        if (!country.taxRefundSupported()) {
            return new RefundAnalysis(List.of(), List.of(), null, null);
        }
        List<String> reasons = new ArrayList<>();
        if (!group.eligible()) {
            reasons.add("자격 확인");
        }
        if (group.amount().compareTo(THRESHOLD) <= 0) {
            reasons.add("€100 초과 확인");
        }
        if (!reasons.isEmpty()) {
            return new RefundAnalysis(List.of(), List.copyOf(reasons), null, null);
        }
        String alert = bveRegistered ? null : ALERT;
        String multiDayNote = alert != null && group.multiDay() ? MULTI_DAY_NOTE : null;
        return new RefundAnalysis(options(group.amount(), group.instant(), group.city()), List.of(), alert, multiDayNote);
    }

    /** 즉시 · 시내 지원 여부에 따라 store · city를 넣는다. 금액 조건은 확인하지 않는다 (R29). */
    public List<RefundOption> options(BigDecimal amount, boolean instant, boolean city) {
        List<RefundOption> options = new ArrayList<>();
        options.add(new RefundOption(RefundOptionId.AIRPORT_CARD, rate(amount, "0.12", "0")));
        options.add(new RefundOption(RefundOptionId.AIRPORT_CASH, rate(amount, "0.105", "3")));
        if (instant) {
            options.add(new RefundOption(RefundOptionId.STORE, rate(amount, "0.10", "0")));
        }
        if (city) {
            options.add(new RefundOption(RefundOptionId.CITY, rate(amount, "0.11", "2")));
        }
        return List.copyOf(options);
    }

    /** max(0, round2(금액 × 비율 − 고정 비용)) */
    private static BigDecimal rate(BigDecimal amount, String ratio, String fixed) {
        BigDecimal value = Money.round2(amount.multiply(new BigDecimal(ratio)).subtract(new BigDecimal(fixed)));
        return value.signum() < 0 ? Money.round2(BigDecimal.ZERO) : value;
    }
}
