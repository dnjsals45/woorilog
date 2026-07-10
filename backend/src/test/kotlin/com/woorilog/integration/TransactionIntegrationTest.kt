package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.*
import com.woorilog.service.DevLoginResponse
import com.woorilog.service.CategoryResponse
import com.woorilog.service.TransactionResponse
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TransactionIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var ledgerRepository: LedgerRepository

    @Autowired
    private lateinit var ledgerCategoryRepository: LedgerCategoryRepository

    @Autowired
    private lateinit var transactionRepository: TransactionRepository

    @Autowired
    private lateinit var ledgerMemberRepository: LedgerMemberRepository

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
    fun should_SeedDefaultCategories_When_DevLoginAndLedgerCreated() {
        // 1. Dev login User A
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // 2. Fetch seeded categories
        val result = mockMvc.perform(get("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(5)))
            .andReturn()

        val categories: List<CategoryResponse> = objectMapper.readValue(
            result.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )

        // Seeded: 식비 (EXPENSE), 카페 (EXPENSE), 교통 (EXPENSE), 생활 (EXPENSE), 급여 (INCOME)
        val categoryNames = categories.map { it.name }
        assertEquals(listOf("식비", "카페", "교통", "생활", "급여"), categoryNames)

        val foodCat = categories.first { it.name == "식비" }
        assertEquals(CategoryType.EXPENSE, foodCat.type)
        assertEquals(true, foodCat.defaultCategory)

        val salaryCat = categories.first { it.name == "급여" }
        assertEquals(CategoryType.INCOME, salaryCat.type)
        assertEquals(true, salaryCat.defaultCategory)
    }

    @Test
    fun should_CreateCategory_When_ValidRequest() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        val requestBody = mapOf(
            "name" to "여행",
            "type" to "EXPENSE"
        )

        // Create a custom category
        mockMvc.perform(post("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").isNotEmpty)
            .andExpect(jsonPath("$.name").value("여행"))
            .andExpect(jsonPath("$.type").value("EXPENSE"))
            .andExpect(jsonPath("$.defaultCategory").value(false))

        // Duplicate name should fail
        mockMvc.perform(post("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
    }

    @Test
    fun should_CreateAndGetAndUpdateTransaction_When_Authorized() {
        // 1. Dev login
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

        // 2. Create transaction
        val requestBody = mapOf(
            "type" to "EXPENSE",
            "amount" to 12000,
            "transactionDate" to "2026-07-09",
            "categoryId" to foodCat.id,
            "memo" to "식당에서 점심",
            "payerUserId" to null // defaults to current user
        )

        val createResult = mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(requestBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").isNotEmpty)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.type").value("EXPENSE"))
            .andExpect(jsonPath("$.amount").value(12000))
            .andExpect(jsonPath("$.transactionDate").value("2026-07-09"))
            .andExpect(jsonPath("$.category.id").value(foodCat.id))
            .andExpect(jsonPath("$.category.name").value("식비"))
            .andExpect(jsonPath("$.payer.id").value(loginResponse.user.id))
            .andExpect(jsonPath("$.payer.nickname").value("유저A"))
            .andExpect(jsonPath("$.memo").value("식당에서 점심"))
            .andReturn()

        val txResponse = objectMapper.readValue(createResult.response.contentAsString, TransactionResponse::class.java)
        val txId = txResponse.id

        // 3. Get transaction details
        mockMvc.perform(get("/api/transactions/$txId")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(txId))
            .andExpect(jsonPath("$.amount").value(12000))
            .andExpect(jsonPath("$.memo").value("식당에서 점심"))

        // 4. Update transaction
        val updateBody = mapOf(
            "type" to "INCOME",
            "amount" to 50000,
            "transactionDate" to "2026-07-10",
            "categoryId" to salaryCat.id,
            "memo" to "보너스",
            "payerUserId" to loginResponse.user.id
        )

        mockMvc.perform(put("/api/transactions/$txId")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(updateBody)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(txId))
            .andExpect(jsonPath("$.type").value("INCOME"))
            .andExpect(jsonPath("$.amount").value(50000))
            .andExpect(jsonPath("$.transactionDate").value("2026-07-10"))
            .andExpect(jsonPath("$.category.id").value(salaryCat.id))
            .andExpect(jsonPath("$.category.name").value("급여"))
            .andExpect(jsonPath("$.memo").value("보너스"))
    }

    @Test
    fun should_PreserveExistingPayer_When_UpdatingTransactionWithoutPayer() {
        val ownerLogin = devLogin("owner@example.com", "소유자")
        val memberLogin = devLogin("member@example.com", "멤버")
        val ledger = ledgerRepository.findById(ownerLogin.currentLedger.id).orElseThrow()
        val member = userRepository.findById(memberLogin.user.id).orElseThrow()
        ledgerMemberRepository.save(LedgerMember(ledger, member, LedgerRole.MEMBER))

        val createResult = mockMvc.perform(post("/api/ledgers/${ledger.id}/transactions")
            .header("Authorization", "Bearer ${ownerLogin.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE", "amount" to 12000, "transactionDate" to "2026-07-09",
                "categoryId" to null, "memo" to "공동 지출", "payerUserId" to member.id
            ))))
            .andExpect(status().isOk)
            .andReturn()
        val transaction = objectMapper.readValue(createResult.response.contentAsString, TransactionResponse::class.java)

        mockMvc.perform(put("/api/transactions/${transaction.id}")
            .header("Authorization", "Bearer ${ownerLogin.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE", "amount" to 13000, "transactionDate" to "2026-07-09",
                "categoryId" to null, "memo" to "금액 수정"
            ))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.payer.id").value(member.id))
            .andExpect(jsonPath("$.amount").value(13000))
    }

    @Test
    fun should_ValidateTransactionCreation_When_InvalidInputs() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        val catResult = mockMvc.perform(get("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token"))
            .andReturn()
        val categories: List<CategoryResponse> = objectMapper.readValue(
            catResult.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )
        val foodCat = categories.first { it.name == "식비" }

        // Test 1: negative amount
        val invalidAmountRequest = mapOf(
            "type" to "EXPENSE",
            "amount" to -500,
            "transactionDate" to "2026-07-09",
            "categoryId" to foodCat.id,
            "memo" to "잘못된 금액"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(invalidAmountRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

        // Test 2: type and category mismatch (INCOME type with EXPENSE category)
        val typeMismatchRequest = mapOf(
            "type" to "INCOME",
            "amount" to 20000,
            "transactionDate" to "2026-07-09",
            "categoryId" to foodCat.id,
            "memo" to "미스매치"
        )
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(typeMismatchRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
    }

    @Test
    fun should_ReturnTransactionsInMonth_When_GetMonthTransactions() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // Create transactions in different dates/months
        val t1 = mapOf(
            "type" to "EXPENSE", "amount" to 1000, "transactionDate" to "2026-07-09",
            "categoryId" to null, "memo" to "T1", "payerUserId" to null
        )
        val t2 = mapOf(
            "type" to "EXPENSE", "amount" to 2000, "transactionDate" to "2026-07-15",
            "categoryId" to null, "memo" to "T2", "payerUserId" to null
        )
        val t3 = mapOf(
            "type" to "EXPENSE", "amount" to 3000, "transactionDate" to "2026-06-30",
            "categoryId" to null, "memo" to "T3", "payerUserId" to null
        )

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(t1)))
            .andExpect(status().isOk)

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(t2)))
            .andExpect(status().isOk)

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(t3)))
            .andExpect(status().isOk)

        // Query July 2026 -> should return T2 then T1 (date desc, id desc)
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/2026-07/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].memo").value("T2"))
            .andExpect(jsonPath("$[1].memo").value("T1"))

        // Query June 2026 -> should return T3
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/2026-06/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))
            .andExpect(jsonPath("$[0].memo").value("T3"))

        // Query invalid month -> 400 INVALID_REQUEST
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/2026-13/transactions")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
    }

    @Test
    fun should_ParseQuickTransaction_When_ValidText() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        // Fetch seeded categories to know which is the first EXPENSE category
        val catResult = mockMvc.perform(get("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token"))
            .andReturn()
        val categories: List<CategoryResponse> = objectMapper.readValue(
            catResult.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )
        val firstExpenseCat = categories.filter { it.type == CategoryType.EXPENSE }.minByOrNull { it.sortOrder }
        assertNotNull(firstExpenseCat)

        // Test 1: "마트 12000원"
        mockMvc.perform(post("/api/ledgers/$ledgerId/quick-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("text" to "마트 12000원"))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.amount").value(12000))
            .andExpect(jsonPath("$.type").value("EXPENSE"))
            .andExpect(jsonPath("$.category.id").value(firstExpenseCat!!.id))
            .andExpect(jsonPath("$.memo").value("마트 12000원"))
            .andExpect(jsonPath("$.transactionDate").value(LocalDate.now().toString()))

        // Test 2: "7월 9일 편의점 4500" with explicit transaction date
        mockMvc.perform(post("/api/ledgers/$ledgerId/quick-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "text" to "7월 9일 편의점 4500",
                "transactionDate" to "2026-07-09"
            ))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.amount").value(4500))
            .andExpect(jsonPath("$.type").value("EXPENSE"))
            .andExpect(jsonPath("$.memo").value("7월 9일 편의점 4500"))
            .andExpect(jsonPath("$.transactionDate").value("2026-07-09"))
    }

    @Test
    fun should_ProtectLedgerMembership_When_AccessingOthersLedger() {
        // 1. Setup User A
        val loginA = devLogin("user-a@example.com", "유저A")
        val tokenA = loginA.accessToken
        val ledgerIdA = loginA.currentLedger.id

        // Create transaction under User A's ledger
        val createResult = mockMvc.perform(post("/api/ledgers/$ledgerIdA/transactions")
            .header("Authorization", "Bearer $tokenA")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE", "amount" to 5000, "transactionDate" to "2026-07-09",
                "categoryId" to null, "memo" to "User A Tx", "payerUserId" to null
            ))))
            .andExpect(status().isOk)
            .andReturn()
        val txA = objectMapper.readValue(createResult.response.contentAsString, TransactionResponse::class.java)

        // 2. Setup User B
        val loginB = devLogin("user-b@example.com", "유저B")
        val tokenB = loginB.accessToken

        // 3. User B tries to get User A's categories -> 403 Forbidden
        mockMvc.perform(get("/api/ledgers/$ledgerIdA/categories")
            .header("Authorization", "Bearer $tokenB"))
            .andExpect(status().isForbidden)

        // 4. User B tries to create category under User A's ledger -> 403 Forbidden
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/categories")
            .header("Authorization", "Bearer $tokenB")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf("name" to "해킹카테고리", "type" to "EXPENSE"))))
            .andExpect(status().isForbidden)

        // 5. User B tries to create transaction under User A's ledger -> 403 Forbidden
        mockMvc.perform(post("/api/ledgers/$ledgerIdA/transactions")
            .header("Authorization", "Bearer $tokenB")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE", "amount" to 1000, "transactionDate" to "2026-07-09",
                "categoryId" to null, "memo" to "침입", "payerUserId" to null
            ))))
            .andExpect(status().isForbidden)

        // 6. User B tries to read User A's transaction details -> 403 Forbidden
        mockMvc.perform(get("/api/transactions/${txA.id}")
            .header("Authorization", "Bearer $tokenB"))
            .andExpect(status().isForbidden)

        // 7. User B tries to update User A's transaction -> 403 Forbidden
        mockMvc.perform(put("/api/transactions/${txA.id}")
            .header("Authorization", "Bearer $tokenB")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(mapOf(
                "type" to "EXPENSE", "amount" to 999999, "transactionDate" to "2026-07-09",
                "categoryId" to null, "memo" to "수정 시도", "payerUserId" to null
            ))))
            .andExpect(status().isForbidden)
    }
}
