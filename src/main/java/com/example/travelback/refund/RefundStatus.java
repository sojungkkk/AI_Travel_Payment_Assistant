package com.example.travelback.refund;

/** 환급 상태 (R53). label은 화면 표시용이다. */
public enum RefundStatus {
    COMPLETED("완료"),
    DELAYED("입금 지연"),
    WAITING("환급 대기"),
    EXPIRED("기한 만료"),
    CUSTOMS_NEEDED("세관 확인 필요"),
    DOCS_MISSING("서류 미발급"),
    NOT_APPLICABLE("해당 없음");

    private final String label;

    RefundStatus(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
