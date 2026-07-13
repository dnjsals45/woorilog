package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.CategoryType
import com.woorilog.domain.RecurringFrequency
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.CategoryResponse
import com.woorilog.service.TransactionResponse
import com.woorilog.service.RecurringTransactionTemplateResponse
import com.woorilog.service.RecurringTransactionDueResponse
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecurringTransactionIntegrationTest {

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
    fun should_CreateListAndUpdateTemplate_When_ValidRequest() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // Get default categories
        val catResult = mockMvc.perform(get("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token"))
            .andReturn()
        val categories: List<CategoryResponse> = objectMapper.readValue(
            catResult.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )
        val foodCat = categories.first { it.name == "식비" }
        val salaryCat = categories.first { it.name == "급여" }

        // 1. Create recurring template
        val requestBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 10000,
            "categoryId" to foodCat.id,
            "memo" to "주간 식비",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01",
            "endDate" to "2026-08-01"
        )

        val createResult = mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").isNotEmpty)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.type").value("EXPENSE"))
            .andExpect(jsonPath("$.amount").value(10000))
            .andExpect(jsonPath("$.category.id").value(foodCat.id))
            .andExpect(jsonPath("$.category.name").value("식비"))
            .andExpect(jsonPath("$.payer.id").value(loginResponse.user.id))
            .andExpect(jsonPath("$.payer.nickname").value("유저A"))
            .andExpect(jsonPath("$.memo").value("주간 식비"))
            .andExpect(jsonPath("$.frequency").value("WEEKLY"))
            .andExpect(jsonPath("$.startDate").value("2026-07-01"))
            .andExpect(jsonPath("$.nextDueDate").value("2026-07-08"))
            .andExpect(jsonPath("$.endDate").value("2026-08-01"))
            .andExpect(jsonPath("$.paused").value(false))
            .andReturn()

        val templateResponse = objectMapper.readValue(createResult.response.contentAsString, RecurringTransactionTemplateResponse::class.java)
        val templateId = templateResponse.id

        mockMvc.perform(get("/api/ledgers/$ledgerId/months/2026-07/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].transactionDate").value("2026-07-01"))

        // 2. List templates
        mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].id").value(templateId))

        // 3. Update template (reset nextDueDate because startDate/frequency changed)
        val updateBody = mapOf(
            "type" to "INCOME",
            "amount" to 20000,
            "categoryId" to salaryCat.id,
            "memo" to "월급",
            "payerUserId" to loginResponse.user.id,
            "frequency" to "MONTHLY",
            "startDate" to "2026-07-10",
            "endDate" to "2026-10-10"
        )

        mockMvc.perform(put("/api/recurring-transactions/$templateId")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(templateId))
            .andExpect(jsonPath("$.type").value("INCOME"))
            .andExpect(jsonPath("$.amount").value(20000))
            .andExpect(jsonPath("$.category.id").value(salaryCat.id))
            .andExpect(jsonPath("$.frequency").value("MONTHLY"))
            .andExpect(jsonPath("$.startDate").value("2026-07-10"))
            .andExpect(jsonPath("$.nextDueDate").value("2026-07-10")) // reset to startDate
            .andExpect(jsonPath("$.endDate").value("2026-10-10"))
    }

    @Test
    fun should_PauseAndResumeTemplate_When_Requested() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        val requestBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 5000,
            "categoryId" to null,
            "memo" to "구독 서비스",
            "payerUserId" to null,
            "frequency" to "MONTHLY",
            "startDate" to "2026-07-01",
            "endDate" to null
        )

        val createResult = mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andReturn()

        val templateResponse = objectMapper.readValue(createResult.response.contentAsString, RecurringTransactionTemplateResponse::class.java)
        val templateId = templateResponse.id

        // Pause
        mockMvc.perform(post("/api/recurring-transactions/$templateId/pause")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.paused").value(true))

        // Resume
        mockMvc.perform(post("/api/recurring-transactions/$templateId/resume")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.paused").value(false))
    }

    @Test
    fun should_QueryDueTemplates_When_Requested() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // Create weekly template starting 2026-07-01, ending 2026-07-20
        val requestBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 3000,
            "categoryId" to null,
            "memo" to "커피",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01",
            "endDate" to "2026-07-20"
        )

        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)

        // The start occurrence is registered immediately, so only 2026-07-08 remains due.
        val result = mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions/due")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-07-10"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].dueDate").value("2026-07-08"))
            .andReturn()

        val dueOccurrences: List<RecurringTransactionDueResponse> = objectMapper.readValue(
            result.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, RecurringTransactionDueResponse::class.java)
        )
        assertEquals(1, dueOccurrences.size)
        assertEquals("2026-07-08", dueOccurrences[0].dueDate.toString())

        // Pause template and verify no due templates are returned
        val templateId = dueOccurrences[0].template.id
        mockMvc.perform(post("/api/recurring-transactions/$templateId/pause")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)

        mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions/due")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-07-10"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    @Test
    fun should_GenerateTransactionsAndAdvanceNextDueDate_When_GenerateCalled() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // 1. Create weekly template starting 2026-07-01, ending 2026-07-20
        val requestBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 8000,
            "categoryId" to null,
            "memo" to "점심 정기",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01",
            "endDate" to "2026-07-20"
        )

        val createRes = mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andReturn()

        val template = objectMapper.readValue(createRes.response.contentAsString, RecurringTransactionTemplateResponse::class.java)
        val templateId = template.id

        // 2. The start occurrence is already recorded; generate the next occurrence up to 2026-07-10.
        val genResult = mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions/generate")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-07-10"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].transactionDate").value("2026-07-08"))
            .andReturn()

        val generatedList: List<TransactionResponse> = objectMapper.readValue(
            genResult.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, TransactionResponse::class.java)
        )
        assertEquals(1, generatedList.size)

        // Verify nextDueDate is advanced to 2026-07-15
        mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].nextDueDate").value("2026-07-15"))

        // 3. Generate again up to 2026-07-10 -> should NOT duplicate and return empty list
        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions/generate")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-07-10"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))

        // 4. Generate up to 2026-07-17 -> should generate 2026-07-15
        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions/generate")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-07-17"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].transactionDate").value("2026-07-15"))

        // Verify nextDueDate is advanced to 2026-07-22
        mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$[0].nextDueDate").value("2026-07-22"))

        // 5. Generate up to 2026-08-01 -> nextDueDate 2026-07-22 is past endDate 2026-07-20, so nothing generated
        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions/generate")
            .header("Authorization", "Bearer $token")
            .param("asOf", "2026-08-01"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
    }

    @Test
    fun should_DeleteTemplateAndKeepAlreadyGeneratedTransactions() {
        val loginResponse = devLogin("delete-template@example.com", "삭제테스트")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id
        val createResult = mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE",
                "amount" to 15_000,
                "categoryId" to null,
                "memo" to "삭제할 구독",
                "payerUserId" to null,
                "frequency" to "MONTHLY",
                "startDate" to "2026-07-10",
                "endDate" to null,
            ))))
            .andExpect(status().isOk)
            .andReturn()
        val templateId = objectMapper.readTree(createResult.response.contentAsString)["id"].asLong()

        mockMvc.perform(delete("/api/recurring-transactions/$templateId")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isNoContent)

        mockMvc.perform(get("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(0)))
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/2026-07/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].memo").value("삭제할 구독"))
    }

    @Test
    fun should_ValidateCategoryAndMemberAccess_When_InvalidInputs() {
        // Setup User A
        val loginA = devLogin("user-a@example.com", "유저A")
        val tokenA = loginA.accessToken
        val ledgerIdA = loginA.currentLedger.id

        val catResult = mockMvc.perform(get("/api/ledgers/$ledgerIdA/categories")
            .header("Authorization", "Bearer $tokenA"))
            .andReturn()
        val categories: List<CategoryResponse> = objectMapper.readValue(
            catResult.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )
        val foodCat = categories.first { it.name == "식비" } // EXPENSE

        // Setup User B
        val loginB = devLogin("user-b@example.com", "유저B")
        val tokenB = loginB.accessToken

        // Test 1: Negative amount -> 400 Bad Request
        val negativeAmountBody = mapOf(
            "type" to "EXPENSE",
            "amount" to -100,
            "categoryId" to foodCat.id,
            "memo" to "음수",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/recurring-transactions")
            .header("Authorization", "Bearer $tokenA")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(negativeAmountBody)))
            .andExpect(status().isBadRequest)

        // Test 2: Category type mismatch (INCOME type with EXPENSE category) -> 400 Bad Request
        val mismatchBody = mapOf(
            "type" to "INCOME",
            "amount" to 5000,
            "categoryId" to foodCat.id,
            "memo" to "미스매치",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/recurring-transactions")
            .header("Authorization", "Bearer $tokenA")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mismatchBody)))
            .andExpect(status().isBadRequest)

        // Test 3: End date before start date -> 400 Bad Request
        val dateOrderBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 5000,
            "categoryId" to foodCat.id,
            "memo" to "날짜오류",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-10",
            "endDate" to "2026-07-01"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/recurring-transactions")
            .header("Authorization", "Bearer $tokenA")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(dateOrderBody)))
            .andExpect(status().isBadRequest)

        // Test 4: User B tries to create template in User A's ledger -> 403 Forbidden
        val userBBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 5000,
            "categoryId" to null,
            "memo" to "침입",
            "payerUserId" to null,
            "frequency" to "WEEKLY",
            "startDate" to "2026-07-01"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/recurring-transactions")
            .header("Authorization", "Bearer $tokenB")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(userBBody)))
            .andExpect(status().isForbidden)
    }
}
