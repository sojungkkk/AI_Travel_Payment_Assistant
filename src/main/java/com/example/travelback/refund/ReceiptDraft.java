package com.example.travelback.refund;

import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;

/** 사용자가 확인하기 전의 영수증 입력 초안. 비어 있는 항목은 null이다. */
public record ReceiptDraft(String store, LocalDate date, BigDecimal amount, PaymentMethod method) {
}
