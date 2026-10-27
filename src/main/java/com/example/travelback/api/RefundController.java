package com.example.travelback.api;

import com.example.travelback.common.DomainException;
import com.example.travelback.ocr.OcrHistoryRecorder;
import com.example.travelback.refund.ReceiptDraft;
import com.example.travelback.refund.ReceiptDraftMapper;
import com.example.travelback.refund.ReceiptReader;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class RefundController {

    private final ReceiptReader receiptReader;
    private final OcrHistoryRecorder historyRecorder;
    private final ReceiptDraftMapper draftMapper = new ReceiptDraftMapper();

    public RefundController(ReceiptReader receiptReader, OcrHistoryRecorder historyRecorder) {
        this.receiptReader = receiptReader;
        this.historyRecorder = historyRecorder;
    }

    /** 성공이든 실패든 인식 요청은 이력에 남긴다 (R51). */
    @PostMapping(path = "/api/receipts/ocr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReceiptDraftResponse recognize(@RequestParam("file") MultipartFile file) throws IOException {
        ReceiptDraft draft;
        try {
            draft = draftMapper.recognize(receiptReader, file.getBytes(), file.getContentType());
        } catch (DomainException e) {
            historyRecorder.recordFailure(file.getContentType(), file.getSize(), e.errorCode());
            throw e;
        }
        historyRecorder.recordSuccess(file.getContentType(), file.getSize(), draft);
        return ReceiptDraftResponse.from(draft);
    }
}
