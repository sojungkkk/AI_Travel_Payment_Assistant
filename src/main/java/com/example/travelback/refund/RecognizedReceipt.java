package com.example.travelback.refund;

/** 사진에서 읽은 그대로의 값. 읽지 못한 항목은 null이다. */
public record RecognizedReceipt(String store, String date, String amount, String payment) {
}
