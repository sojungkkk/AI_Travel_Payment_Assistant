package com.example.travelback.refund;

/** 영수증 사진을 읽는 외부 서비스. 테스트에서는 가짜 구현을 쓴다. */
public interface ReceiptReader {

    RecognizedReceipt read(byte[] image, String contentType);
}
