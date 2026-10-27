package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReceiptDraftMapperTest {

    private final ReceiptDraftMapper mapper = new ReceiptDraftMapper();

    @Test
    void 사진인식_카드결제는_결제수단을_비운_초안이다() {
        RecognizedReceipt recognized = new RecognizedReceipt("Galeries Paris", "2026-11-12", "420.00", "card");

        ReceiptDraft draft = mapper.toDraft(recognized);

        assertEquals("Galeries Paris", draft.store());
        assertEquals(LocalDate.of(2026, 11, 12), draft.date());
        assertEquals(new BigDecimal("420.00"), draft.amount());
        assertNull(draft.method());
    }

    @Test
    void 사진인식_현금결제는_결제수단이_cash다() {
        RecognizedReceipt recognized = new RecognizedReceipt("Galeries Paris", "2026-11-12", "420.00", "cash");

        ReceiptDraft draft = mapper.toDraft(recognized);

        assertEquals(PaymentMethod.CASH, draft.method());
    }

    @Test
    void 사진인식_금액420점005는_420점01이다() {
        RecognizedReceipt recognized = new RecognizedReceipt("Galeries Paris", "2026-11-12", "420.005", "card");

        ReceiptDraft draft = mapper.toDraft(recognized);

        assertEquals(new BigDecimal("420.01"), draft.amount());
    }

    @Test
    void 사진인식_날짜를_못읽으면_구매일만_비운다() {
        RecognizedReceipt recognized = new RecognizedReceipt("Galeries Paris", null, "420.00", "cash");

        ReceiptDraft draft = mapper.toDraft(recognized);

        assertNull(draft.date());
        assertEquals("Galeries Paris", draft.store());
        assertEquals(new BigDecimal("420.00"), draft.amount());
        assertEquals(PaymentMethod.CASH, draft.method());
    }

    @Test
    void 사진인식_PNG_10MB는_허용되고_1바이트넘으면_INVALID_FILE다() {
        long tenMegabytes = 10L * 1024 * 1024;

        assertDoesNotThrow(() -> mapper.validateFile("image/png", tenMegabytes));
        DomainException e = assertThrows(DomainException.class,
                () -> mapper.validateFile("image/png", tenMegabytes + 1));
        assertEquals(ErrorCode.INVALID_FILE, e.errorCode());
    }

    @Test
    void 사진인식_GIF나_PDF는_INVALID_FILE다() {
        for (String contentType : List.of("image/gif", "application/pdf")) {
            DomainException e = assertThrows(DomainException.class,
                    () -> mapper.validateFile(contentType, 1024));
            assertEquals(ErrorCode.INVALID_FILE, e.errorCode());
        }
    }

    @Test
    void 사진인식_응답이_깨지거나_시간초과면_OCR_FAILED다() {
        List<RuntimeException> failures = List.of(
                new IllegalStateException("Unexpected end-of-input in JSON"),
                new UncheckedIOException(new SocketTimeoutException("timeout")));

        for (RuntimeException failure : failures) {
            ReceiptReader reader = (image, contentType) -> {
                throw failure;
            };

            DomainException e = assertThrows(DomainException.class,
                    () -> mapper.recognize(reader, new byte[] {1}, "image/png"));
            assertEquals(ErrorCode.OCR_FAILED, e.errorCode());
        }
    }
}
