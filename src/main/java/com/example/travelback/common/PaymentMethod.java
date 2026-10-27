package com.example.travelback.common;

import java.math.BigDecimal;

/** 결제 수단별 가산율 travel 0% · standard 1.3% · cash 2% (1.0) */
public enum PaymentMethod {
    TRAVEL("0"),
    STANDARD("0.013"),
    CASH("0.02");

    private final BigDecimal surcharge;

    PaymentMethod(String surcharge) {
        this.surcharge = new BigDecimal(surcharge);
    }

    public BigDecimal surcharge() {
        return surcharge;
    }

    /** R8 결제 원화 비용 = round(금액 × 기준환율 × (1 + 가산율)) */
    public long cost(BigDecimal amount, BigDecimal rate) {
        return Money.krw(amount.multiply(rate).multiply(BigDecimal.ONE.add(surcharge)));
    }
}
