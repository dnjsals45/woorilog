package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.service.DevLoginResponse
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TransactionImportIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private fun devLogin(email: String, nickname: String): DevLoginResponse {
        val requestBody = mapOf(
            "email" to email,
            "nickname" to nickname
        )
        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }

    @Test
    fun should_ReturnTransactionCandidates_When_TextPreviewRequested() {
        val login = devLogin("import@example.com", "가져오기")
        val requestBody = mapOf(
            "text" to "2026-07-09 식비 점심 12,000원\n급여 입금 500000원\n메모만 있는 줄",
            "transactionDate" to "2026-07-10",
            "ocrEngine" to "tesseract.js",
            "sourceName" to "receipt.png"
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports/preview")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.candidates", hasSize<Any>(2)))
            .andExpect(jsonPath("$.candidates[0].type").value("EXPENSE"))
            .andExpect(jsonPath("$.candidates[0].amount").value(12000))
            .andExpect(jsonPath("$.candidates[0].transactionDate").value("2026-07-09"))
            .andExpect(jsonPath("$.candidates[0].categoryName").value("식비"))
            .andExpect(jsonPath("$.candidates[1].type").value("INCOME"))
            .andExpect(jsonPath("$.candidates[1].amount").value(500000))
            .andExpect(jsonPath("$.rejectedLines").value(1))
    }

    @Test
    fun should_ReturnBadRequest_When_TextIsBlank() {
        val login = devLogin("import-blank@example.com", "빈텍스트")
        val requestBody = mapOf(
            "text" to " ",
            "transactionDate" to "2026-07-10"
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports/preview")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
    }
}
