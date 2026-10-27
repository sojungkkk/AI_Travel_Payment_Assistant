package com.example.travelback.common;

public enum Country {
    FR(true),
    JP(false),
    TH(false);

    private final boolean taxRefundSupported;

    Country(boolean taxRefundSupported) {
        this.taxRefundSupported = taxRefundSupported;
    }

    public boolean taxRefundSupported() {
        return taxRefundSupported;
    }
}
