package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import org.junit.jupiter.api.Test;

class VatNumberTest {

    @Test
    void VAT번호_공백과_소문자를_정규화한다() {
        assertEquals("FR12345678901", VatNumber.normalize("fr 12 345678901"));
        assertNull(VatNumber.normalize(""));
        assertNull(VatNumber.normalize(null));
    }

    @Test
    void VAT번호_형식이_틀리면_INVALID_VAT다() {
        DomainException e = assertThrows(DomainException.class, () -> VatNumber.normalize("FR12345"));

        assertEquals(ErrorCode.INVALID_VAT, e.errorCode());
    }
}
