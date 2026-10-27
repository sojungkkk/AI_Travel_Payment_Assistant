package com.example.travelback.api;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class StaticPageTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void 정적화면_목업과_사진인식_스크립트를_제공한다() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("index.html"));

        String page = utf8(get("/index.html"));
        assertThat(page, containsString("id=\"receipt-file\""));
        assertThat(page, containsString("<script src=\"ocr.js\"></script>"));
        assertThat(page, containsString("사진은 Claude로 전송돼 인식돼요"));

        assertThat(utf8(get("/ocr.js")), containsString("/api/receipts/ocr"));

        // 3페이지 VAT · 환급 진행 · BVE 등록 (R24, R52, R53, R55)
        assertThat(page, containsString("id=\"vat-number\""));
        assertThat(page, containsString("id=\"refund-status\""));
        assertThat(page, containsString("id=\"bve-form\""));
        assertThat(page, containsString("세관 · 사업자 처리는 자동 확인되지 않아요"));
        String app = utf8(get("/app.js"));
        assertThat(app, containsString("/api/refunds/tracker"));
        assertThat(app, containsString("/api/refunds/bve"));
    }

    /** 정적 파일 응답에는 문자셋 표시가 없어 UTF-8로 직접 읽는다 (페이지는 meta charset=utf-8). */
    private String utf8(org.springframework.test.web.servlet.RequestBuilder request) throws Exception {
        return mockMvc.perform(request)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
    }
}
