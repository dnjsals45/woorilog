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
    fun should_ParseKakaoPayListing_When_ShortYearDatesAndRepeatedMerchantsAreProvided() {
        val login = devLogin("import-kakaopay@example.com", "카카오페이 가져오기")
        val requestBody = mapOf(
            "text" to """
                26.07.12 바오 25000
                26.07.11 쿠우쿠우화정점 95700
                26.07.11 긱스타PC 9000
                26.07.11 긱스타PC 5000
                26.07.11 긱스타PC 3000
            """.trimIndent(),
            "transactionDate" to "2026-07-13",
            "ocrEngine" to "tesseract.js",
            "sourceName" to "test1.png",
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports/preview")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.candidates", hasSize<Any>(5)))
            .andExpect(jsonPath("$.candidates[0].transactionDate").value("2026-07-12"))
            .andExpect(jsonPath("$.candidates[0].memo").value("바오"))
            .andExpect(jsonPath("$.candidates[0].amount").value(25000))
            .andExpect(jsonPath("$.candidates[1].transactionDate").value("2026-07-11"))
            .andExpect(jsonPath("$.candidates[1].memo").value("쿠우쿠우화정점"))
            .andExpect(jsonPath("$.candidates[1].amount").value(95700))
            .andExpect(jsonPath("$.candidates[2].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[2].amount").value(9000))
            .andExpect(jsonPath("$.candidates[3].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[3].amount").value(5000))
            .andExpect(jsonPath("$.candidates[4].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[4].amount").value(3000))
            .andExpect(jsonPath("$.rejectedLines").value(0))
    }

    @Test
    fun should_GroupKakaoPayOcrRowsUnderTheirDateHeaders() {
        val login = devLogin("import-kakaopay-ocr@example.com", "카카오페이 OCR 가져오기")
        val requestBody = mapOf(
            "text" to """
                26. 7. 12 (일)
                바오                                                25,000원
                일시불ㆍZ work Edition2
                26. 7. 11(토)
                쿠우쿠우화정점                                    95,700원
                일시불ㆍZ work Edition2
                긱스타PC                                            9,000원
                일시불ㆍZ work Edition2
                긱스타PC                                            5,000원
                일시불ㆍZ work Edition2
                긱스타PC                                            3,000원
                일시불ㆍZ work Edition2
            """.trimIndent(),
            "transactionDate" to "2026-07-13",
            "ocrEngine" to "tesseract.js",
            "sourceName" to "test1.png",
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports/preview")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.candidates", hasSize<Any>(5)))
            .andExpect(jsonPath("$.candidates[0].transactionDate").value("2026-07-12"))
            .andExpect(jsonPath("$.candidates[0].memo").value("바오"))
            .andExpect(jsonPath("$.candidates[0].amount").value(25000))
            .andExpect(jsonPath("$.candidates[1].transactionDate").value("2026-07-11"))
            .andExpect(jsonPath("$.candidates[1].memo").value("쿠우쿠우화정점"))
            .andExpect(jsonPath("$.candidates[1].amount").value(95700))
            .andExpect(jsonPath("$.candidates[2].transactionDate").value("2026-07-11"))
            .andExpect(jsonPath("$.candidates[2].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[2].amount").value(9000))
            .andExpect(jsonPath("$.candidates[3].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[3].amount").value(5000))
            .andExpect(jsonPath("$.candidates[4].memo").value("긱스타PC"))
            .andExpect(jsonPath("$.candidates[4].amount").value(3000))
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
