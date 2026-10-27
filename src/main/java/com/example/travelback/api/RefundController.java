package com.example.travelback.api;

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
    private final ReceiptDraftMapper draftMapper = new ReceiptDraftMapper();

    public RefundController(ReceiptReader receiptReader) {
        this.receiptReader = receiptReader;
    }

    @PostMapping(path = "/api/receipts/ocr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ReceiptDraftResponse recognize(@RequestParam("file") MultipartFile file) throws IOException {
        return ReceiptDraftResponse.from(
                draftMapper.recognize(receiptReader, file.getBytes(), file.getContentType()));
    }
}
