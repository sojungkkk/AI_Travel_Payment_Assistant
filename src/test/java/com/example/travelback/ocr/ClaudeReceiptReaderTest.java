package com.example.travelback.ocr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ClaudeReceiptReaderTest {

    @Test
    void 사진인식_API키가_없으면_OCR_UNAVAILABLE다() {
        for (String apiKey : Arrays.asList(null, "", "   ")) {
            ClaudeReceiptReader reader = new ClaudeReceiptReader(null, apiKey);

            DomainException e = assertThrows(DomainException.class,
                    () -> reader.read(new byte[] {1}, "image/png"));
            assertEquals(ErrorCode.OCR_UNAVAILABLE, e.errorCode());
        }
    }
}
