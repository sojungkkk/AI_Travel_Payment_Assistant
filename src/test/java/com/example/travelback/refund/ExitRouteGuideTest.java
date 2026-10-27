package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExitRouteGuideTest {

    private static final LocalDate PURCHASE = LocalDate.of(2026, 11, 12);

    private final ExitRouteGuide guide = new ExitRouteGuide();

    private static boolean has(List<String> lines, String text) {
        return lines.stream().anyMatch(line -> line.contains(text));
    }

    @Test
    void 출국안내_프랑스_공항카드는_PABLO단말과_준비물을_안내한다() {
        ExitGuide g = guide.guide(ExitCountry.FR, "파리 샤를드골 (CDG)", RefundOptionId.AIRPORT_CARD, PURCHASE, null);

        assertTrue(has(g.atExit(), "짐 부치기 전 PABLO 키오스크"));
        assertTrue(has(g.beforeDeparture(), "물건"));
        assertTrue(has(g.beforeDeparture(), "여권"));
        assertTrue(has(g.beforeDeparture(), "서류"));
        assertTrue(has(g.beforeDeparture(), "2027-02-28 D-day"));
        assertEquals("https://www.douane.gouv.fr/en/fiche/tax-exemption-france-tourists-pablo", g.customsLink());
    }

    @Test
    void 출국안내_프랑스는_빨간화면이면_창구도장과_우편함투함을_안내한다() {
        ExitGuide g = guide.guide(ExitCountry.FR, "파리 샤를드골 (CDG)", RefundOptionId.AIRPORT_CARD, PURCHASE, null);

        assertTrue(has(g.atExit(), "초록 화면"));
        assertTrue(has(g.atExit(), "빨간 화면"));
        assertTrue(has(g.atExit(), "세관 창구 도장"));
        assertTrue(has(g.atExit(), "우편함 투함"));
        assertTrue(has(g.atExit(), "보안검색"));
    }

    @Test
    void 출국안내_프랑스_매장은_카드보증과_반송기한_D데이를_안내한다() {
        ExitGuide g = guide.guide(ExitCountry.FR, "파리 샤를드골 (CDG)", RefundOptionId.STORE, PURCHASE, PURCHASE);

        assertTrue(has(g.atStore(), "카드 보증"));
        assertTrue(has(g.beforeDeparture(), "2026-12-03 D-day"));
    }

    @Test
    void 출국안내_다른EU국가는_그나라_세관도장을_안내한다() {
        ExitGuide g = guide.guide(ExitCountry.OTHER_EU, "로마 피우미치노", RefundOptionId.AIRPORT_CARD, PURCHASE, null);

        assertTrue(has(g.atExit(), "그 나라 세관 도장"));
        assertTrue(has(g.atExit(), "프랑스 자동 완료 아님"));
        assertTrue(has(g.atExit(), "6개월"));
    }

    @Test
    void 출국안내_공항이_비면_샤를드골이_기본값이다() {
        assertEquals("파리 샤를드골 (CDG)",
                guide.guide(ExitCountry.FR, "  ", RefundOptionId.AIRPORT_CARD, PURCHASE, null).airport());
        assertEquals("파리 샤를드골 (CDG)",
                guide.guide(ExitCountry.FR, null, RefundOptionId.AIRPORT_CARD, PURCHASE, null).airport());
    }
}
