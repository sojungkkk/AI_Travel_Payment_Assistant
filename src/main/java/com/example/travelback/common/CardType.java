package com.example.travelback.common;

/** 여행 정보의 보유 카드. NONE이면 현금으로 결제한다고 본다. */
public enum CardType {
    TRAVEL,
    STANDARD,
    NONE;

    public PaymentMethod paymentMethod() {
        return switch (this) {
            case TRAVEL -> PaymentMethod.TRAVEL;
            case STANDARD -> PaymentMethod.STANDARD;
            case NONE -> PaymentMethod.CASH;
        };
    }
}
