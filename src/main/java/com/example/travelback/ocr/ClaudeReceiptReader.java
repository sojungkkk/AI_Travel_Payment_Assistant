package com.example.travelback.ocr;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.refund.ReceiptReader;
import com.example.travelback.refund.RecognizedReceipt;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.util.MimeTypeUtils;

/** Spring AI ChatClient로 Claude에게 영수증 사진을 읽힌다 (R51). 모델 · 시간 제한은 application.properties에 둔다. */
public class ClaudeReceiptReader implements ReceiptReader {

    private static final Logger log = LoggerFactory.getLogger(ClaudeReceiptReader.class);

    private static final String INSTRUCTION = """
            This is a photo of a shopping receipt from France.
            Read only what is printed. If a field is unreadable or missing, return null for it.
            - store: the shop name as printed.
            - date: the purchase date as YYYY-MM-DD.
            - amount: the total paid in EUR as a plain decimal string with a dot, e.g. "1234.50".
            - payment: "cash" if paid in cash, "card" if paid by card, otherwise null.
            Never return card numbers or any other personal data.""";

    private final ChatClient chatClient;

    /** 키가 없으면 ChatClient를 만들지 않고, 인식 요청만 OCR_UNAVAILABLE로 거절한다. */
    public ClaudeReceiptReader(ChatClient.Builder builder, String apiKey) {
        this.chatClient = apiKey == null || apiKey.isBlank() ? null : builder.build();
    }

    @Override
    public RecognizedReceipt read(byte[] image, String contentType) {
        if (chatClient == null) {
            throw new DomainException(ErrorCode.OCR_UNAVAILABLE);
        }
        BeanOutputConverter<ReceiptFields> converter = new BeanOutputConverter<>(ReceiptFields.class);
        ReceiptFields fields;
        try {
            ChatResponse response = chatClient.prompt()
                    .user(u -> u.text(INSTRUCTION + "\n" + converter.getFormat())
                            .media(MimeTypeUtils.parseMimeType(contentType), new ByteArrayResource(image)))
                    .call()
                    .chatResponse();
            // 응답 첫 블록이 빈 thinking일 수 있어 .entity() 대신 글이 든 마지막 블록을 골라 JSON으로 바꾼다
            String json = response.getResults().stream()
                    .map(generation -> generation.getOutput().getText())
                    .filter(text -> text != null && !text.isBlank())
                    .reduce((first, last) -> last)
                    .orElseThrow(() -> new IllegalStateException("응답에 글이 없음"));
            fields = converter.convert(json);
        } catch (RuntimeException e) {      // 키 오류 · 시간 초과 · 응답 형식 오류 → 원인은 로그로 남기고 OCR_FAILED
            log.warn("영수증 인식 실패: {}", e.toString());
            throw new DomainException(ErrorCode.OCR_FAILED);
        }
        if (fields == null) {
            throw new DomainException(ErrorCode.OCR_FAILED);
        }
        return new RecognizedReceipt(fields.store(), fields.date(), fields.amount(), fields.payment());
    }

    /** 모델이 채울 JSON 구조. 금액은 double을 피하려고 문자열로 받는다. */
    record ReceiptFields(
            @JsonPropertyDescription("Shop name as printed on the receipt") String store,
            @JsonPropertyDescription("Purchase date, YYYY-MM-DD") String date,
            @JsonPropertyDescription("Total paid in EUR as a decimal string with a dot, e.g. 1234.50") String amount,
            @JsonPropertyDescription("cash or card") String payment) {
    }
}
