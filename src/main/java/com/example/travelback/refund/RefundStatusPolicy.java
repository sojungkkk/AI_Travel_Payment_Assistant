package com.example.travelback.refund;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.Money;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 환급 상태를 위에서부터 처음 맞는 것으로 판정한다 (R53). 세관 확인일은 BVE 발행일 ~ 오늘이어야 한다 (R55).
 * 세관 · 사업자 처리는 자동 확인하지 않고 사용자가 표시한 확인일 · 수령 여부로만 판단한다.
 */
public class RefundStatusPolicy {

    private static final int DELAY_DAYS = 42;
    private static final int OPERATOR_MONTHS = 6;
    private static final BigDecimal PENALTY_FACTOR = new BigDecimal("1.15");

    private final RefundDeadlines deadlines = new RefundDeadlines();

    public RefundStatusResult evaluate(ReceiptGroup group, boolean hasOptions, Bve bve, long bveKRW,
            LocalDate confirmedOn, boolean received, LocalDate today) {
        if (confirmedOn != null && (bve == null || confirmedOn.isBefore(bve.issuedOn()) || confirmedOn.isAfter(today))) {
            throw new DomainException(ErrorCode.INVALID_CONFIRM_DATE);
        }
        boolean early = bve != null && bve.method().early();
        LocalDate deadline = deadline(group, bve);
        if (bve == null && !hasOptions) {
            return new RefundStatusResult(RefundStatus.NOT_APPLICABLE, null, 0, deadline);
        }
        if (received || (early && confirmedOn != null)) {
            return new RefundStatusResult(RefundStatus.COMPLETED, null, 0, deadline);
        }
        if (confirmedOn != null && today.isAfter(confirmedOn.plusDays(DELAY_DAYS))) {
            String note = "세관 확인 후 6주가 지나도 입금 전이에요. 환급사업자에 문의해 주세요.";
            if (today.isAfter(bve.issuedOn().plusMonths(OPERATOR_MONTHS))) {
                note += " 사업자 처리 기한 지남, 바로 문의";
            }
            return new RefundStatusResult(RefundStatus.DELAYED, note, 0, deadline);
        }
        if (confirmedOn != null) {
            return new RefundStatusResult(RefundStatus.WAITING, null, 0, deadline);
        }
        if (today.isAfter(deadline)) {
            long penalty = early ? Money.krw(BigDecimal.valueOf(bveKRW).multiply(PENALTY_FACTOR)) : 0;
            String note = early
                    ? "환급 불가 · 21일 안에 세관 확인이 안 돼 카드로 청구될 수 있어요"
                    : "환급 불가 · 세관 확인 기한이 지났어요";
            return new RefundStatusResult(RefundStatus.EXPIRED, note, penalty, deadline);
        }
        if (bve != null) {
            return new RefundStatusResult(RefundStatus.CUSTOMS_NEEDED, null, 0, deadline);
        }
        return new RefundStatusResult(RefundStatus.DOCS_MISSING, null, 0, deadline);
    }

    /** 선환급이면 반송 기한과 세관 기한 중 이른 날(store 환급일 = 묶음 시작일, city = BVE 발행일), 아니면 세관 기한 (R30) */
    private LocalDate deadline(ReceiptGroup group, Bve bve) {
        if (bve == null || !bve.method().early()) {
            return deadlines.customs(group.startDate());
        }
        LocalDate refundDate = bve.method() == RefundOptionId.STORE ? group.startDate() : bve.issuedOn();
        return deadlines.effective(group.startDate(), refundDate);
    }
}
