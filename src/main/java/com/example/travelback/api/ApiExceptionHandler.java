package com.example.travelback.api;

import com.example.travelback.common.DomainException;
import com.example.travelback.common.ErrorCode;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 오류를 2.3 형식 {@code {errors:[{field, code, message}]}}으로 돌려준다.
 * Spring 기본 처리(404 · 405 등)는 상위 클래스에 맡긴다.
 */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static final Map<ErrorCode, HttpStatus> STATUS = Map.of(
            ErrorCode.DUPLICATE_RECEIPT, HttpStatus.CONFLICT,
            ErrorCode.DUPLICATE_EXPENSE, HttpStatus.CONFLICT,
            ErrorCode.ALREADY_LINKED, HttpStatus.CONFLICT,
            ErrorCode.REFUND_ALREADY_APPLIED, HttpStatus.CONFLICT,
            ErrorCode.OCR_FAILED, HttpStatus.BAD_GATEWAY,
            ErrorCode.OCR_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE,
            ErrorCode.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);

    private static final Map<ErrorCode, String> FIELD = Map.of(
            ErrorCode.INVALID_FILE, "file");

    private static final Map<ErrorCode, String> MESSAGE = Map.of(
            ErrorCode.INVALID_FILE, "JPG · PNG · WebP 사진(10MB 이하)만 인식할 수 있습니다.",
            ErrorCode.OCR_UNAVAILABLE, "지금은 사진 인식을 쓸 수 없습니다. 영수증 정보를 직접 입력해 주세요.",
            ErrorCode.OCR_FAILED, "사진을 읽지 못했습니다. 영수증 정보를 직접 입력해 주세요.",
            ErrorCode.INTERNAL_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ApiErrorResponse> handleDomain(DomainException e) {
        return error(e.errorCode());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception e) {
        log.error("처리하지 못한 오류", e);
        return error(ErrorCode.INTERNAL_ERROR);
    }

    /** 서버 업로드 한도(10MB)를 넘은 파일도 INVALID_FILE로 돌려준다 (기본은 413). */
    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body(ErrorCode.INVALID_FILE));
    }

    private static ResponseEntity<ApiErrorResponse> error(ErrorCode code) {
        return ResponseEntity.status(STATUS.getOrDefault(code, HttpStatus.BAD_REQUEST)).body(body(code));
    }

    private static ApiErrorResponse body(ErrorCode code) {
        String message = MESSAGE.getOrDefault(code, "요청을 처리할 수 없습니다.");
        return new ApiErrorResponse(List.of(new ApiErrorResponse.ApiError(FIELD.get(code), code.name(), message)));
    }
}
