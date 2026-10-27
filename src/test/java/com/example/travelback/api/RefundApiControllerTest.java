package com.example.travelback.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(RefundApiController.class)
class RefundApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void API_트래커는_묶음별_상태와_기한을_돌려준다() throws Exception {
        String body = """
                {"receipts":[{"id":"r1","store":"파리 백화점","date":"2026-11-12","amount":420,"method":"travel",
                  "vatNumber":"","eligible":true,"instant":true,"city":true}],
                 "bves":{},"confirmations":{},"received":[],"today":"2026-11-20"}
                """;

        mockMvc.perform(post("/api/refunds/tracker").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].key").value("파리 백화점|2026-11-12"))
                .andExpect(jsonPath("$[0].ids[0]").value("r1"))
                .andExpect(jsonPath("$[0].status").value("DOCS_MISSING"))
                .andExpect(jsonPath("$[0].statusLabel").value("서류 미발급"))
                .andExpect(jsonPath("$[0].customsDeadline").value("2027-02-28"))
                .andExpect(jsonPath("$[0].alert").exists())
                .andExpect(jsonPath("$[0].rows.length()").value(4))
                .andExpect(jsonPath("$[0].rows[0].id").value("airport-card"))
                .andExpect(jsonPath("$[0].rows[0].net").value(584366))
                .andExpect(jsonPath("$[0].rows[0].label").value("추정"));
    }

    @Test
    void API_트래커는_BVE가_있으면_확인된_1행을_돌려준다() throws Exception {
        String body = """
                {"receipts":[{"id":"r1","store":"파리 백화점","date":"2026-11-12","amount":420,"method":"travel",
                  "eligible":true,"instant":true,"city":true}],
                 "bves":{"파리 백화점|2026-11-12":{"operator":"Global Blue","issuedOn":"2026-11-12","pablo":true,
                   "method":"airport-card","amount":50.4}},
                 "confirmations":{"파리 백화점|2026-11-12":"2026-11-25"},"received":[],"today":"2026-11-30"}
                """;

        mockMvc.perform(post("/api/refunds/tracker").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("WAITING"))
                .andExpect(jsonPath("$[0].bveKRW").value(79234))
                .andExpect(jsonPath("$[0].alert").doesNotExist())
                .andExpect(jsonPath("$[0].rows.length()").value(1))
                .andExpect(jsonPath("$[0].rows[0].label").value("확인됨"));
    }

    @Test
    void API_구매전비교_금액0이면_400_INVALID_AMOUNT다() throws Exception {
        mockMvc.perform(post("/api/refunds/plan").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":0,\"card\":\"travel\",\"instant\":\"YES\",\"city\":\"YES\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].code").value("INVALID_AMOUNT"));
    }

    @Test
    void API_구매전비교는_행마다_차이와_할말을_돌려준다() throws Exception {
        mockMvc.perform(post("/api/refunds/plan").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":420,\"card\":\"standard\",\"instant\":\"YES\",\"city\":\"NO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.eligible").value(true))
                .andExpect(jsonPath("$.rows.length()").value(9))
                .andExpect(jsonPath("$.rows[0].lowest").value(true))
                .andExpect(jsonPath("$.rows[0].phrase.ko").value("택스리펀 서류 발급해 주세요. 환급은 카드로 받을게요."))
                .andExpect(jsonPath("$.saving").value(8627));
    }

    @Test
    void API_BVE_상한초과면_400_INVALID_REFUND_AMOUNT다() throws Exception {
        String body = """
                {"group":{"startDate":"2026-11-12","amount":420,"method":"travel"},
                 "bve":{"operator":"Global Blue","issuedOn":"2026-11-12","pablo":true,"method":"airport-card","amount":70.01}}
                """;

        mockMvc.perform(post("/api/refunds/bve").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].code").value("INVALID_REFUND_AMOUNT"));
    }

    @Test
    void API_BVE_정상이면_예정원화를_돌려준다() throws Exception {
        String body = """
                {"group":{"startDate":"2026-11-12","amount":420,"method":"travel"},
                 "bve":{"operator":" Global Blue ","issuedOn":"2026-11-12","pablo":true,"method":"airport-card","amount":50.4}}
                """;

        mockMvc.perform(post("/api/refunds/bve").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bve.operator").value("Global Blue"))
                .andExpect(jsonPath("$.expectedKRW").value(79234));
    }
}
