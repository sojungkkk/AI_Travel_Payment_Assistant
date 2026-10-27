package com.example.travelback.ocr;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 영수증 사진 인식 요청 1건의 기록 (R51). 사진과 카드번호는 저장하지 않는다. */
@Entity
@Table(name = "ocr_history")
public class OcrHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime requestedAt;

    @Column(nullable = false, length = 50)
    private String model;

    @Column(length = 50)
    private String fileType;

    private long fileSize;

    /** OK 또는 오류 코드(INVALID_FILE · OCR_FAILED · OCR_UNAVAILABLE) */
    @Column(nullable = false, length = 30)
    private String result;

    @Column(length = 80)
    private String store;

    private LocalDate purchaseDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(length = 20)
    private String paymentMethod;

    protected OcrHistory() {
    }

    OcrHistory(LocalDateTime requestedAt, String model, String fileType, long fileSize, String result,
            String store, LocalDate purchaseDate, BigDecimal amount, String paymentMethod) {
        this.requestedAt = requestedAt;
        this.model = model;
        this.fileType = fileType;
        this.fileSize = fileSize;
        this.result = result;
        this.store = store;
        this.purchaseDate = purchaseDate;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
    }

    public Long getId() {
        return id;
    }

    public LocalDateTime getRequestedAt() {
        return requestedAt;
    }

    public String getModel() {
        return model;
    }

    public String getFileType() {
        return fileType;
    }

    public long getFileSize() {
        return fileSize;
    }

    public String getResult() {
        return result;
    }

    public String getStore() {
        return store;
    }

    public LocalDate getPurchaseDate() {
        return purchaseDate;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }
}
