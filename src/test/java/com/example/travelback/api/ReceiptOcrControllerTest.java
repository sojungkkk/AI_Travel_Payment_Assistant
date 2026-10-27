package com.example.travelback.api;

import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.ocr.OcrHistoryRecorder;
import com.example.travelback.refund.ReceiptDraft;
import com.example.travelback.refund.ReceiptReader;
import com.example.travelback.refund.RecognizedReceipt;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest
class ReceiptOcrControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReceiptReader receiptReader;

    @MockitoBean
    private OcrHistoryRecorder historyRecorder;

    @Test
    void API_영수증사진_인식하면_200과_초안을_돌려준다() throws Exception {
        given(receiptReader.read(any(), eq("image/png")))
                .willReturn(new RecognizedReceipt("Galeries Paris", "2026-11-12", "420.00", "card"));
        MockMultipartFile photo = new MockMultipartFile("file", "receipt.png", "image/png", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/receipts/ocr").file(photo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.store").value("Galeries Paris"))
                .andExpect(jsonPath("$.date").value("2026-11-12"))
                .andExpect(jsonPath("$.amount").value(420.00))
                .andExpect(jsonPath("$.method").doesNotExist());
    }

    @Test
    void API_영수증사진_GIF면_400_INVALID_FILE다() throws Exception {
        MockMultipartFile gif = new MockMultipartFile("file", "receipt.gif", "image/gif", new byte[] {1, 2, 3});

        mockMvc.perform(multipart("/api/receipts/ocr").file(gif))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.length()").value(1))
                .andExpect(jsonPath("$.errors[0].field").value("file"))
                .andExpect(jsonPath("$.errors[0].code").value("INVALID_FILE"))
                .andExpect(jsonPath("$.errors[0].message").isNotEmpty());
    }

    @Test
    void API_API키가_없으면_503_OCR_UNAVAILABLE다() throws Exception {
        given(receiptReader.read(any(), any())).willThrow(new DomainException(ErrorCode.OCR_UNAVAILABLE));

        mockMvc.perform(multipart("/api/receipts/ocr").file(png()))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.errors[0].field").value(nullValue()))
                .andExpect(jsonPath("$.errors[0].code").value("OCR_UNAVAILABLE"));
    }

    @Test
    void API_인식에_실패하면_502_OCR_FAILED다() throws Exception {
        given(receiptReader.read(any(), any()))
                .willThrow(new UncheckedIOException(new SocketTimeoutException("timeout")));

        mockMvc.perform(multipart("/api/receipts/ocr").file(png()))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.errors[0].field").value(nullValue()))
                .andExpect(jsonPath("$.errors[0].code").value("OCR_FAILED"));
    }

    @Test
    void API_영수증사진_인식하면_성공과_실패를_이력에_남긴다() throws Exception {
        given(receiptReader.read(any(), eq("image/png")))
                .willReturn(new RecognizedReceipt("G7", "2023-12-13", "18.20", null))
                .willThrow(new DomainException(ErrorCode.OCR_FAILED));

        mockMvc.perform(multipart("/api/receipts/ocr").file(png())).andExpect(status().isOk());
        mockMvc.perform(multipart("/api/receipts/ocr").file(png())).andExpect(status().isBadGateway());

        then(historyRecorder).should().recordSuccess("image/png", 3,
                new ReceiptDraft("G7", LocalDate.of(2023, 12, 13), new BigDecimal("18.20"), null));
        then(historyRecorder).should().recordFailure("image/png", 3, ErrorCode.OCR_FAILED);
    }

    private static MockMultipartFile png() {
        return new MockMultipartFile("file", "receipt.png", "image/png", new byte[] {1, 2, 3});
    }
}
