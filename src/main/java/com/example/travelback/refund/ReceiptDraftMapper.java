package com.example.travelback.refund;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Set;

public class ReceiptDraftMapper {

    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;

    public void validateFile(String contentType, long size) {
        if (contentType == null || !IMAGE_TYPES.contains(contentType) || size > MAX_FILE_BYTES) {
            throw new DomainException(ErrorCode.INVALID_FILE);
        }
    }

    public ReceiptDraft recognize(ReceiptReader reader, byte[] image, String contentType) {
        validateFile(contentType, image.length);
        RecognizedReceipt recognized;
        try {
            recognized = reader.read(image, contentType);
        } catch (DomainException e) {
            throw e;
        } catch (RuntimeException e) {
            throw new DomainException(ErrorCode.OCR_FAILED);
        }
        return toDraft(recognized);
    }

    public ReceiptDraft toDraft(RecognizedReceipt recognized) {
        return new ReceiptDraft(
                store(recognized.store()),
                date(recognized.date()),
                amount(recognized.amount()),
                method(recognized.payment()));
    }

    private static String store(String store) {
        if (store == null || store.isBlank()) {
            return null;
        }
        return store.strip();
    }

    private static LocalDate date(String date) {
        if (date == null) {
            return null;
        }
        try {
            return LocalDate.parse(date.strip());
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    private static BigDecimal amount(String amount) {
        if (amount == null) {
            return null;
        }
        try {
            return new BigDecimal(amount.strip()).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** 카드는 트래블카드인지 일반카드인지 알 수 없으므로 비워 둔다 (R51). */
    private static PaymentMethod method(String payment) {
        return "cash".equalsIgnoreCase(payment) ? PaymentMethod.CASH : null;
    }
}
