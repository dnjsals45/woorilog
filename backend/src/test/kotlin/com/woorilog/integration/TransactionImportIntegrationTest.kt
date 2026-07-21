package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.TransactionImageOcr
import com.woorilog.service.TransactionImageOcrResult
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.mock.web.MockMultipartFile
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(TransactionImportIntegrationTest.OcrTestConfiguration::class)
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

    @Test
    fun should_SaveSelectedCandidatesTogether_When_ImportSaveRequested() {
        val login = devLogin("import-save@example.com", "일괄 저장")
        val requestBody = mapOf(
            "candidates" to listOf(
                mapOf(
                    "type" to "EXPENSE",
                    "amount" to 12_000,
                    "transactionDate" to "2026-07-09",
                    "categoryId" to null,
                    "memo" to "점심",
                ),
                mapOf(
                    "type" to "INCOME",
                    "amount" to 500_000,
                    "transactionDate" to "2026-07-10",
                    "categoryId" to null,
                    "memo" to "급여",
                ),
            ),
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].memo").value("점심"))
            .andExpect(jsonPath("$[1].memo").value("급여"))

        mockMvc.perform(get("/api/ledgers/${login.currentLedger.id}/months/2026-07/transactions")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    fun should_NotSaveAnyCandidates_When_OneImportCandidateIsInvalid() {
        val login = devLogin("import-save-invalid@example.com", "일괄 저장 실패")
        val requestBody = mapOf(
            "candidates" to listOf(
                mapOf(
                    "type" to "EXPENSE",
                    "amount" to 12_000,
                    "transactionDate" to "2026-07-09",
                    "categoryId" to null,
                    "memo" to "저장되면 안 됨",
                ),
                mapOf(
                    "type" to "EXPENSE",
                    "amount" to 0,
                    "transactionDate" to "2026-07-10",
                    "categoryId" to null,
                    "memo" to "유효하지 않은 금액",
                ),
            ),
        )

        mockMvc.perform(post("/api/ledgers/${login.currentLedger.id}/transaction-imports")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

        mockMvc.perform(get("/api/ledgers/${login.currentLedger.id}/months/2026-07/transactions")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    @Test
    fun should_ReturnOcrTextAndCandidates_When_ImagePreviewRequested() {
        val login = devLogin("import-image@example.com", "이미지 가져오기")
        val image = MockMultipartFile(
            "image",
            "receipt.png",
            MediaType.IMAGE_PNG_VALUE,
            byteArrayOf(1, 2, 3),
        )

        mockMvc.perform(multipart("/api/ledgers/${login.currentLedger.id}/transaction-imports/ocr-preview")
            .file(image)
            .param("transactionDate", "2026-07-21")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.extractedText").value("26.07.12 바오 25,000원"))
            .andExpect(jsonPath("$.ocrEngine").value("tesseract-5-server"))
            .andExpect(jsonPath("$.candidates", hasSize<Any>(1)))
            .andExpect(jsonPath("$.candidates[0].memo").value("바오"))
            .andExpect(jsonPath("$.candidates[0].amount").value(25000))
            .andExpect(jsonPath("$.candidates[0].transactionDate").value("2026-07-12"))
    }

    @Test
    fun should_CombineCandidates_When_MultipleImagesAreRequested() {
        val login = devLogin("import-multiple-images@example.com", "여러 이미지 가져오기")
        val firstImage = MockMultipartFile(
            "image",
            "receipt-1.png",
            MediaType.IMAGE_PNG_VALUE,
            byteArrayOf(1, 2, 3),
        )
        val secondImage = MockMultipartFile(
            "image",
            "receipt-2.png",
            MediaType.IMAGE_PNG_VALUE,
            byteArrayOf(4, 5, 6),
        )

        mockMvc.perform(multipart("/api/ledgers/${login.currentLedger.id}/transaction-imports/ocr-preview")
            .file(firstImage)
            .file(secondImage)
            .param("transactionDate", "2026-07-21")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.candidates", hasSize<Any>(2)))
            .andExpect(jsonPath("$.candidates[0].id").value("image-1-candidate-1"))
            .andExpect(jsonPath("$.candidates[1].id").value("image-2-candidate-1"))
            .andExpect(jsonPath("$.candidates[0].memo").value("바오"))
            .andExpect(jsonPath("$.candidates[1].memo").value("바오"))
            .andExpect(jsonPath("$.extractedText").value("26.07.12 바오 25,000원\n\n26.07.12 바오 25,000원"))
    }

    @Test
    fun should_ReturnBadRequest_When_MoreThanTenImagesAreRequested() {
        val login = devLogin("import-too-many-images@example.com", "이미지 초과")
        val request = multipart("/api/ledgers/${login.currentLedger.id}/transaction-imports/ocr-preview")
        request.header("Authorization", "Bearer ${login.accessToken}")
        repeat(11) { index ->
            request.file(MockMultipartFile(
                "image",
                "receipt-$index.png",
                MediaType.IMAGE_PNG_VALUE,
                byteArrayOf(1, 2, 3),
            ))
        }

        mockMvc.perform(request)
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_OCR_IMAGE"))
    }

    @Test
    fun should_ReturnBadRequest_When_ImagePartIsMissing() {
        val login = devLogin("import-image-missing@example.com", "이미지 없음")

        mockMvc.perform(multipart("/api/ledgers/${login.currentLedger.id}/transaction-imports/ocr-preview")
            .header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_OCR_IMAGE"))
    }

    @TestConfiguration
    class OcrTestConfiguration {

        @Bean
        @Primary
        fun transactionImageOcr(): TransactionImageOcr = TransactionImageOcr { _, _ ->
            TransactionImageOcrResult(
                text = "26.07.12 바오 25,000원",
                engine = "tesseract-5-server",
            )
        }
    }
}
