package com.example.travelback.refund;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.example.travelback.common.Country;
import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import com.example.travelback.common.PaymentMethod;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class ReceiptRegistrarTest {

    private final ReceiptRegistrar registrar = new ReceiptRegistrar();

    private static Receipt 파리_백화점_420유로() {
        return new Receipt("파리 백화점", LocalDate.of(2026, 11, 12), new BigDecimal("420"),
                PaymentMethod.TRAVEL, null, true, true, true);
    }

    @Test
    void 영수증등록_프랑스면_등록된다() {
        Receipt receipt = 파리_백화점_420유로();

        Receipt registered = registrar.register(Country.FR, receipt, List.of());

        assertEquals(receipt, registered);
    }

    @Test
    void 영수증등록_일본이나_태국이면_UNSUPPORTED_COUNTRY다() {
        for (Country country : List.of(Country.JP, Country.TH)) {
            DomainException e = assertThrows(DomainException.class,
                    () -> registrar.register(country, 파리_백화점_420유로(), List.of()));

            assertEquals(ErrorCode.UNSUPPORTED_COUNTRY, e.errorCode());
            assertEquals("UNSUPPORTED_COUNTRY", e.getMessage());
        }
    }
}
