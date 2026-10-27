package com.example.travelback.refund;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** 출국 경로별 체크리스트 (R36). 프랑스 출국은 키오스크 초록 / 빨간 화면으로 나눠 안내한다. */
public class ExitRouteGuide {

    static final String DEFAULT_AIRPORT = "파리 샤를드골 (CDG)";
    static final String CUSTOMS_LINK = "https://www.douane.gouv.fr/en/fiche/tax-exemption-france-tourists-pablo";

    private final RefundDeadlines deadlines = new RefundDeadlines();

    /** refundDate는 선환급(store · city)일 때만 쓴다. store는 구매일을 환급일로 본다 (R30). */
    public ExitGuide guide(ExitCountry exitCountry, String airport, RefundOptionId option,
            LocalDate purchase, LocalDate refundDate) {
        String exitAirport = airport == null || airport.isBlank() ? DEFAULT_AIRPORT : airport.strip();
        boolean early = option != null && option.early();

        List<String> atStore = new ArrayList<>(List.of("여권 제시", "택스리펀 서류 요청", "수령 방식 확인"));
        if (early) {
            atStore.add("선환급이면 카드 보증(본인 명의, 6개월 이상 유효)");
        }

        LocalDate dDay = early
                ? deadlines.returnBy(purchase, option == RefundOptionId.STORE ? purchase : refundDate)
                : deadlines.customs(purchase);
        List<String> beforeDeparture = List.of(
                "물건은 사용하지 않고 포장 그대로",
                "서류와 여권 준비",
                (early ? "반송 기한 " : "세관 확인 기한 ") + dDay + " D-day");

        List<String> atExit = exitCountry == ExitCountry.FR
                ? List.of(
                        "① 체크인 · 짐 부치기 전 PABLO 키오스크에서 서류 바코드 스캔",
                        "② 초록 화면이면 완료 (화면 캡처 권장)",
                        "③ 빨간 화면 · 고장 · 바코드 없음이면 세관 창구 도장 → 서류를 사업자 봉투로 우편함 투함",
                        "④ 그다음 보안검색 (통과 후 되돌아올 수 없음)")
                : List.of(
                        "그 나라 세관 도장 필요",
                        "서류 출력본 필요",
                        "프랑스 자동 완료 아님",
                        "판매자가 6개월 안에 전표를 받아야 환급");
        return new ExitGuide(exitAirport, List.copyOf(atStore), beforeDeparture, atExit, CUSTOMS_LINK);
    }
}
