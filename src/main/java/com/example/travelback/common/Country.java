package com.example.travelback.common;

import java.math.BigDecimal;

/** 국가별 택스 리펀드 지원 여부와 기준환율(원/1단위) (1.0) */
public enum Country {
    FR(true, "1580"),
    JP(false, "9.5"),
    TH(false, "43");

    private final boolean taxRefundSupported;
    private final BigDecimal baseRate;

    Country(boolean taxRefundSupported, String baseRate) {
        this.taxRefundSupported = taxRefundSupported;
        this.baseRate = new BigDecimal(baseRate);
    }

    public boolean taxRefundSupported() {
        return taxRefundSupported;
    }

    public BigDecimal baseRate() {
        return baseRate;
    }
}
