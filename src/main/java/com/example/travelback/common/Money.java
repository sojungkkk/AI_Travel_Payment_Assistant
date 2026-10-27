package com.example.travelback.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** 원화는 식 끝에서 한 번 정수 HALF_UP, 외화는 소수 둘째 자리 HALF_UP (C1, C2). */
public final class Money {

    private Money() {
    }

    public static long krw(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    public static BigDecimal round2(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
