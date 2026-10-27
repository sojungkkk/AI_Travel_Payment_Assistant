package com.example.travelback.api;

import java.util.List;

/** 오류 응답 형식 (2.3). */
public record ApiErrorResponse(List<ApiError> errors) {

    public record ApiError(String field, String code, String message) {
    }
}
