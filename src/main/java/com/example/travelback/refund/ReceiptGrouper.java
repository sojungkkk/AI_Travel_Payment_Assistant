package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** 합산 키(VAT, 없으면 정규화 매장명)가 같고 시작일부터 3일 안의 영수증을 한 묶음으로 합친다 (R26). */
public class ReceiptGrouper {

    private static final int WINDOW_DAYS = 2;

    public List<ReceiptGroup> group(List<Receipt> receipts) {
        Map<String, List<Integer>> byKey = new LinkedHashMap<>();
        for (int i = 0; i < receipts.size(); i++) {
            byKey.computeIfAbsent(mergeKey(receipts.get(i)), k -> new ArrayList<>()).add(i);
        }
        List<ReceiptGroup> groups = new ArrayList<>();
        byKey.forEach((mergeKey, indexes) -> {
            List<Integer> sorted = indexes.stream()
                    .sorted(Comparator.comparing((Integer i) -> receipts.get(i).date()).thenComparing(i -> i))
                    .toList();
            int from = 0;
            while (from < sorted.size()) {
                var start = receipts.get(sorted.get(from)).date();
                int to = from;
                while (to < sorted.size() && !receipts.get(sorted.get(to)).date().isAfter(start.plusDays(WINDOW_DAYS))) {
                    to++;
                }
                groups.add(merge(mergeKey, receipts, sorted.subList(from, to)));
                from = to;
            }
        });
        groups.sort(Comparator.comparing(ReceiptGroup::startDate).thenComparing(g -> g.receiptIndexes().get(0)));
        return groups;
    }

    private static ReceiptGroup merge(String mergeKey, List<Receipt> receipts, List<Integer> indexes) {
        Receipt first = receipts.get(indexes.get(0));
        BigDecimal amount = BigDecimal.ZERO;
        boolean eligible = true, instant = true, city = true;
        PaymentMethod method = first.method();
        for (int i : indexes) {
            Receipt r = receipts.get(i);
            amount = amount.add(r.amount());
            eligible &= r.eligible();
            instant &= r.instant();
            city &= r.city();
            if (method != r.method()) {
                method = null;
            }
        }
        var end = receipts.get(indexes.get(indexes.size() - 1)).date();
        return new ReceiptGroup(mergeKey + "|" + first.date(), first.store().strip(), first.vatNumber(),
                first.date(), end, amount.setScale(2, RoundingMode.HALF_UP), List.copyOf(indexes),
                eligible, instant, city, method);
    }

    private static String mergeKey(Receipt r) {
        if (r.vatNumber() != null) {
            return r.vatNumber();
        }
        return Normalizer.normalize(r.store(), Normalizer.Form.NFC).strip().toLowerCase(Locale.ROOT);
    }
}
