package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.travelback.common.Country;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class RefundOptionPolicyTest {

    private static final LocalDate D12 = LocalDate.of(2026, 11, 12);

    private final RefundOptionPolicy policy = new RefundOptionPolicy();

    static ReceiptGroup 묶음(String amount, boolean eligible, boolean instant, boolean city, LocalDate end) {
        return new ReceiptGroup("파리 백화점|2026-11-12", "파리 백화점", null, D12, end, new BigDecimal(amount),
                List.of(0), eligible, instant, city, PaymentMethod.TRAVEL);
    }

    static ReceiptGroup 묶음(String amount) {
        return 묶음(amount, true, true, true, D12);
    }

    private static List<String> ids(RefundAnalysis a) {
        return a.options().stream().map(o -> o.id().code()).toList();
    }

    private static BigDecimal refundOf(RefundAnalysis a, RefundOptionId id) {
        return a.options().stream().filter(o -> o.id() == id).findFirst().orElseThrow().refund();
    }

    @Test
    void 환급옵션_100점01유로_자격참이면_생성되고_서류요청알림이_나온다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("100.01"), false);

        assertEquals(4, a.options().size());
        assertTrue(a.reasons().isEmpty());
        assertTrue(a.alert().contains("택스리펀 서류(PABLO 바코드)를 요청하세요"));
        assertNull(a.multiDayNote());
    }

    @Test
    void 환급옵션_여러날_묶음은_여러날_안내를_덧붙인다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("110.3", true, true, true, D12.plusDays(1)), false);

        assertNotNull(a.alert());
        assertTrue(a.multiDayNote().contains("매장이 허용할 때만"));
    }

    @Test
    void 환급옵션_100유로면_없고_100유로초과_사유가_나온다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("100"), false);

        assertTrue(a.options().isEmpty());
        assertEquals(List.of("€100 초과 확인"), a.reasons());
        assertNull(a.alert());
    }

    @Test
    void 환급옵션_자격이_없으면_없고_자격_사유가_나온다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("420", false, true, true, D12), false);

        assertTrue(a.options().isEmpty());
        assertEquals(List.of("자격 확인"), a.reasons());
    }

    @Test
    void 환급옵션_자격없고_20유로면_사유가_자격_100유로_순서다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("20", false, true, true, D12), false);

        assertEquals(List.of("자격 확인", "€100 초과 확인"), a.reasons());
    }

    @Test
    void 환급옵션_BVE가_있으면_알림이_없다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("420"), true);

        assertEquals(4, a.options().size());
        assertNull(a.alert());
    }

    @Test
    void 환급옵션_국가가_일본이면_없다() {
        RefundAnalysis a = policy.analyze(Country.JP, 묶음("420"), false);

        assertTrue(a.options().isEmpty());
        assertNull(a.alert());
    }

    @Test
    void 환급옵션_420유로는_4종_환급액이_맞다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("420"), false);

        assertEquals(List.of("airport-card", "airport-cash", "store", "city"), ids(a));
        assertEquals(new BigDecimal("50.40"), refundOf(a, RefundOptionId.AIRPORT_CARD));
        assertEquals(new BigDecimal("41.10"), refundOf(a, RefundOptionId.AIRPORT_CASH));
        assertEquals(new BigDecimal("42.00"), refundOf(a, RefundOptionId.STORE));
        assertEquals(new BigDecimal("44.20"), refundOf(a, RefundOptionId.CITY));
    }

    @Test
    void 환급옵션_100점01유로는_4종_환급액이_맞다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("100.01"), false);

        assertEquals(new BigDecimal("12.00"), refundOf(a, RefundOptionId.AIRPORT_CARD));
        assertEquals(new BigDecimal("7.50"), refundOf(a, RefundOptionId.AIRPORT_CASH));
        assertEquals(new BigDecimal("10.00"), refundOf(a, RefundOptionId.STORE));
        assertEquals(new BigDecimal("9.00"), refundOf(a, RefundOptionId.CITY));
    }

    @Test
    void 환급옵션_즉시와_시내를_지원하지_않으면_공항_2종만_나온다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("420", true, false, false, D12), false);

        assertEquals(List.of("airport-card", "airport-cash"), ids(a));
    }

    @Test
    void 환급옵션_1만유로도_공항현금을_포함한다() {
        RefundAnalysis a = policy.analyze(Country.FR, 묶음("10000"), false);

        assertEquals(new BigDecimal("1047.00"), refundOf(a, RefundOptionId.AIRPORT_CASH));
    }
}
