package com.example.travelback.refund;

import java.util.List;

/** 옵션(추정) · 미충족 사유 · 서류 요청 알림 · 여러 날 안내 (R27). 알림과 안내는 없으면 null이다. */
public record RefundAnalysis(List<RefundOption> options, List<String> reasons, String alert, String multiDayNote) {
}
