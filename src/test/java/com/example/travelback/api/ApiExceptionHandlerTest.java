package com.example.travelback.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class ApiExceptionHandlerTest {

    private final ApiExceptionHandler handler = new ApiExceptionHandler();

    @Test
    void API_업로드한도를_넘으면_400_INVALID_FILE다() {
        MaxUploadSizeExceededException tooLarge = new MaxUploadSizeExceededException(10L * 1024 * 1024);

        ResponseEntity<Object> response = handler.handleMaxUploadSizeExceededException(
                tooLarge, new HttpHeaders(), HttpStatus.CONTENT_TOO_LARGE,
                new ServletWebRequest(new MockHttpServletRequest()));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ApiErrorResponse body = (ApiErrorResponse) response.getBody();
        assertEquals(List.of(new ApiErrorResponse.ApiError("file", "INVALID_FILE",
                body.errors().get(0).message())), body.errors());
    }
}
