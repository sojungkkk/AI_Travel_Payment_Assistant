package com.example.travelback.ocr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.example.travelback.common.ErrorCode;
import com.example.travelback.refund.ReceiptDraft;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

@DataJpaTest
@Import(OcrHistoryRecorder.class)
class OcrHistoryRecorderTest {

    @Autowired
    private OcrHistoryRecorder recorder;

    @Autowired
    private OcrHistoryRepository repository;

    @Test
    void 사진인식_성공하면_인식결과를_이력에_남긴다() {
        recorder.recordSuccess("image/png", 3,
                new ReceiptDraft("G7", LocalDate.of(2023, 12, 13), new BigDecimal("18.20"), null));

        List<OcrHistory> rows = repository.findAll();
        assertEquals(1, rows.size());
        OcrHistory row = rows.get(0);
        assertEquals("OK", row.getResult());
        assertEquals("G7", row.getStore());
        assertEquals(LocalDate.of(2023, 12, 13), row.getPurchaseDate());
        assertEquals(new BigDecimal("18.20"), row.getAmount());
        assertNull(row.getPaymentMethod());
        assertEquals("image/png", row.getFileType());
        assertEquals(3, row.getFileSize());
        assertNotNull(row.getRequestedAt());
        assertNotNull(row.getModel());
    }

    @Test
    void 사진인식_실패하면_오류코드를_이력에_남긴다() {
        recorder.recordFailure("image/jpeg", 10, ErrorCode.OCR_FAILED);

        List<OcrHistory> rows = repository.findAll();
        assertEquals(1, rows.size());
        assertEquals("OCR_FAILED", rows.get(0).getResult());
        assertNull(rows.get(0).getStore());
        assertNull(rows.get(0).getAmount());
    }
}
