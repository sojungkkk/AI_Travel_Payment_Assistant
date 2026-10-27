package com.example.travelback.refund;

import java.util.List;

/** 출국 안내와 3단계 체크리스트(매장에서 / 출국 전 / 최종 EU 출국 시) (R36). */
public record ExitGuide(
        String airport,
        List<String> atStore,
        List<String> beforeDeparture,
        List<String> atExit,
        String customsLink) {
}
