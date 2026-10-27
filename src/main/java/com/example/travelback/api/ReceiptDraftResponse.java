// [임시 주석 처리] com.example.travelback.refund 패키지(ReceiptDraft · ReceiptReader · ReceiptDraftMapper)가
// 아직 저장소에 없어 빌드되지 않는다. refund 패키지가 올라오면 아래 줄의 "// " 를 지워 되살린다.

// package com.example.travelback.api;
//
// import com.example.travelback.refund.ReceiptDraft;
// import com.fasterxml.jackson.annotation.JsonInclude;
// import java.math.BigDecimal;
// import java.time.LocalDate;
// import java.util.Locale;
//
// /** 사진 인식 초안 응답. 읽지 못한 항목은 내려보내지 않는다 (2.3 API 20). */
// @JsonInclude(JsonInclude.Include.NON_NULL)
// public record ReceiptDraftResponse(String store, LocalDate date, BigDecimal amount, String method) {
//
//     static ReceiptDraftResponse from(ReceiptDraft draft) {
//         String method = draft.method() == null ? null : draft.method().name().toLowerCase(Locale.ROOT);
//         return new ReceiptDraftResponse(draft.store(), draft.date(), draft.amount(), method);
//     }
// }
