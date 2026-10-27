package com.example.travelback.refund;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.time.LocalDate;
import java.time.YearMonth;

/** 세관 확인 기한 (R28) · 선환급 반송 기한과 실제 기한 (R30). */
public class RefundDeadlines {

    private static final int RETURN_DAYS = 21;

    /** 구매(묶음 시작)한 달의 다음 달부터 세어 3번째 달의 말일 */
    public LocalDate customs(LocalDate purchase) {
        return YearMonth.from(purchase).plusMonths(3).atEndOfMonth();
    }

    /** 반송 기한 = 환급일 + 21일. 환급일이 구매일보다 앞서면 INVALID_REFUND_DATE */
    public LocalDate returnBy(LocalDate purchase, LocalDate refundDate) {
        if (refundDate == null || refundDate.isBefore(purchase)) {
            throw new DomainException(ErrorCode.INVALID_REFUND_DATE);
        }
        return refundDate.plusDays(RETURN_DAYS);
    }

    /** 반송 기한과 세관 기한 중 이른 날 */
    public LocalDate effective(LocalDate purchase, LocalDate refundDate) {
        LocalDate returnBy = returnBy(purchase, refundDate);
        LocalDate customs = customs(purchase);
        return returnBy.isBefore(customs) ? returnBy : customs;
    }
}
