package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class RefundDeadlinesTest {

    private final RefundDeadlines deadlines = new RefundDeadlines();

    @Test
    void 세관기한_11월12일_구매는_2월28일이다() {
        assertEquals(LocalDate.of(2027, 2, 28), deadlines.customs(LocalDate.of(2026, 11, 12)));
    }

    @Test
    void 세관기한_월말인_11월30일_구매도_2월28일이다() {
        assertEquals(LocalDate.of(2027, 2, 28), deadlines.customs(LocalDate.of(2026, 11, 30)));
    }

    @Test
    void 세관기한_12월1일_구매는_3월31일이다() {
        assertEquals(LocalDate.of(2027, 3, 31), deadlines.customs(LocalDate.of(2026, 12, 1)));
    }

    @Test
    void 세관기한_윤년이면_2월29일이다() {
        assertEquals(LocalDate.of(2028, 2, 29), deadlines.customs(LocalDate.of(2027, 11, 12)));
    }

    @Test
    void 반송기한_store는_구매일부터_21일_뒤다() {
        LocalDate purchase = LocalDate.of(2026, 11, 12);

        assertEquals(LocalDate.of(2026, 12, 3), deadlines.returnBy(purchase, purchase));
        assertEquals(LocalDate.of(2026, 12, 3), deadlines.effective(purchase, purchase));
    }

    @Test
    void 반송기한_city_11월14일_환급은_12월5일이다() {
        LocalDate purchase = LocalDate.of(2026, 11, 12);
        LocalDate refund = LocalDate.of(2026, 11, 14);

        assertEquals(LocalDate.of(2026, 12, 5), deadlines.returnBy(purchase, refund));
        assertEquals(LocalDate.of(2026, 12, 5), deadlines.effective(purchase, refund));
    }

    @Test
    void 반송기한_해를_넘기면_1월10일이다() {
        LocalDate purchase = LocalDate.of(2026, 12, 10);
        LocalDate refund = LocalDate.of(2026, 12, 20);

        assertEquals(LocalDate.of(2027, 1, 10), deadlines.returnBy(purchase, refund));
        assertEquals(LocalDate.of(2027, 1, 10), deadlines.effective(purchase, refund));
    }

    @Test
    void 실제기한_세관기한이_더_이르면_세관기한이다() {
        LocalDate purchase = LocalDate.of(2026, 11, 30);
        LocalDate refund = LocalDate.of(2027, 2, 20);

        assertEquals(LocalDate.of(2027, 3, 13), deadlines.returnBy(purchase, refund));
        assertEquals(LocalDate.of(2027, 2, 28), deadlines.effective(purchase, refund));
    }

    @Test
    void 선환급일이_구매일보다_앞서면_INVALID_REFUND_DATE다() {
        DomainException e = assertThrows(DomainException.class,
                () -> deadlines.returnBy(LocalDate.of(2026, 11, 12), LocalDate.of(2026, 11, 11)));

        assertEquals(ErrorCode.INVALID_REFUND_DATE, e.errorCode());
    }
}
