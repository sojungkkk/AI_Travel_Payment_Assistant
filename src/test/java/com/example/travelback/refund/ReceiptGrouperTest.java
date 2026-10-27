package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReceiptGrouperTest {

    private final ReceiptGrouper grouper = new ReceiptGrouper();

    private static Receipt 영수증(String store, int day, String amount, PaymentMethod method, String vat) {
        return new Receipt(store, LocalDate.of(2026, 11, day), new BigDecimal(amount), method, vat, true, true, true);
    }

    private static Receipt 영수증(String store, int day) {
        return 영수증(store, day, "50", PaymentMethod.TRAVEL, null);
    }

    @Test
    void 합산_같은키_이틀이면_한묶음이고_수단이_섞이면_mixed다() {
        List<ReceiptGroup> groups = grouper.group(List.of(
                영수증(" 파리 백화점 ", 12, "60.1", PaymentMethod.TRAVEL, null),
                영수증("파리 백화점", 13, "50.2", PaymentMethod.CASH, null)));

        assertEquals(1, groups.size());
        ReceiptGroup g = groups.get(0);
        assertEquals(new BigDecimal("110.30"), g.amount());
        assertEquals(LocalDate.of(2026, 11, 12), g.startDate());
        assertEquals(LocalDate.of(2026, 11, 13), g.endDate());
        assertEquals(List.of(0, 1), g.receiptIndexes());
        assertTrue(g.mixed());
        assertNull(g.method());
        assertTrue(g.multiDay());
        assertEquals("파리 백화점|2026-11-12", g.key());
    }

    @Test
    void 영수증합산_수단과_플래그가_모두_같으면_그대로_유지된다() {
        List<ReceiptGroup> groups = grouper.group(List.of(영수증("파리 백화점", 12), 영수증("파리 백화점", 12)));

        assertEquals(1, groups.size());
        ReceiptGroup g = groups.get(0);
        assertEquals(PaymentMethod.TRAVEL, g.method());
        assertTrue(g.eligible() && g.instant() && g.city());
        assertFalse(g.multiDay());
    }

    @Test
    void 합산_3일째까지_한묶음이다() {
        assertEquals(1, grouper.group(List.of(영수증("파리 백화점", 12), 영수증("파리 백화점", 14))).size());
    }

    @Test
    void 합산_4일째는_새묶음이다() {
        assertEquals(2, grouper.group(List.of(영수증("파리 백화점", 12), 영수증("파리 백화점", 15))).size());
    }

    @Test
    void 합산_12_14_15일은_두묶음이다() {
        List<ReceiptGroup> groups = grouper.group(List.of(
                영수증("파리 백화점", 15), 영수증("파리 백화점", 12), 영수증("파리 백화점", 14)));

        assertEquals(2, groups.size());
        assertEquals(LocalDate.of(2026, 11, 12), groups.get(0).startDate());
        assertEquals(LocalDate.of(2026, 11, 14), groups.get(0).endDate());
        assertEquals(List.of(1, 2), groups.get(0).receiptIndexes());
        assertEquals(LocalDate.of(2026, 11, 15), groups.get(1).startDate());
    }

    @Test
    void 합산_같은VAT_다른매장명도_합친다() {
        List<ReceiptGroup> groups = grouper.group(List.of(
                영수증("Galeries Haussmann", 12, "60", PaymentMethod.TRAVEL, "FR12345678901"),
                영수증("Galeries Rivoli", 12, "50", PaymentMethod.TRAVEL, "FR12345678901")));

        assertEquals(1, groups.size());
        assertEquals("FR12345678901", groups.get(0).vatNumber());
        assertEquals("FR12345678901|2026-11-12", groups.get(0).key());
    }

    @Test
    void 합산_VAT유무가_다르면_합치지_않는다() {
        List<ReceiptGroup> groups = grouper.group(List.of(
                영수증("파리 백화점", 12, "60", PaymentMethod.TRAVEL, "FR12345678901"),
                영수증("파리 백화점", 12, "50", PaymentMethod.TRAVEL, null)));

        assertEquals(2, groups.size());
    }
}
