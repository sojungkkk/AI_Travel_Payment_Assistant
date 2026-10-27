package com.example.travelback.refund;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.util.Locale;
import java.util.regex.Pattern;

/** 프랑스 VAT 번호: 공백 제거 · 대문자 후 FR + 영숫자 2자 + 숫자 9자 (R24). */
public final class VatNumber {

    private static final Pattern FORMAT = Pattern.compile("FR[0-9A-Z]{2}[0-9]{9}");

    private VatNumber() {
    }

    /** 빈 값은 "없음"(null)이다. */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String vat = raw.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        if (!FORMAT.matcher(vat).matches()) {
            throw new DomainException(ErrorCode.INVALID_VAT);
        }
        return vat;
    }
}
