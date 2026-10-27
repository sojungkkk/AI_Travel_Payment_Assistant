package com.example.travelback.refund;

import java.math.BigDecimal;

/** 환급 옵션 4종의 환율 계수 · 선환급 여부 · 화면 안내 문구 (R29, R54). */
public enum RefundOptionId {
    AIRPORT_CARD("airport-card", "0.995", false, "세관 확인 후 1~4주", "공항 키오스크 필요 · 카드로 입금",
            "택스리펀 서류 발급해 주세요. 환급은 카드로 받을게요.", "Tax free form, please. Refund to my card."),
    AIRPORT_CASH("airport-cash", "0.98", false, "세관 확인 직후", "공항 환급 창구 대기 · 현금으로 바로 받음",
            "택스리펀 서류 발급해 주세요. 공항에서 현금으로 받을게요.", "Tax free form, please. Cash refund at the airport."),
    STORE("store", "1", true, "결제 시점", "바로 할인 · 21일 안에 세관 확인이 안 되면 카드로 청구",
            "즉시 환급 되나요? 보증 카드 등록할게요.", "Immediate tax refund, please. I'll register my card."),
    CITY("city", "0.995", true, "신청 즉시", "시내 창구 방문 · 21일 안에 세관 확인이 안 되면 카드로 청구",
            "택스리펀 서류 발급해 주세요. 시내 창구에서 받을게요.", "Tax free form, please. I'll claim at the city office.");

    private final String code;
    private final BigDecimal fxFactor;
    private final boolean early;
    private final String receiveTime;
    private final String note;
    private final String phraseKo;
    private final String phraseEn;

    RefundOptionId(String code, String fxFactor, boolean early, String receiveTime, String note,
            String phraseKo, String phraseEn) {
        this.code = code;
        this.fxFactor = new BigDecimal(fxFactor);
        this.early = early;
        this.receiveTime = receiveTime;
        this.note = note;
        this.phraseKo = phraseKo;
        this.phraseEn = phraseEn;
    }

    public String code() {
        return code;
    }

    public BigDecimal fxFactor() {
        return fxFactor;
    }

    /** 세관 확인 전에 돈을 받는 선환급(store · city)인지 (R30) */
    public boolean early() {
        return early;
    }

    public String receiveTime() {
        return receiveTime;
    }

    public String note() {
        return note;
    }

    public String phraseKo() {
        return phraseKo;
    }

    public String phraseEn() {
        return phraseEn;
    }

    public static RefundOptionId fromCode(String code) {
        for (RefundOptionId id : values()) {
            if (id.code.equals(code)) {
                return id;
            }
        }
        return null;
    }
}
