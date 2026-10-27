package com.example.travelback.refund;

import com.example.travelback.common.Country;
import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.util.List;

public class ReceiptRegistrar {

    public Receipt register(Country country, Receipt receipt, List<Receipt> existing) {
        if (!country.taxRefundSupported()) {
            throw new DomainException(ErrorCode.UNSUPPORTED_COUNTRY);
        }
        return receipt;
    }
}
