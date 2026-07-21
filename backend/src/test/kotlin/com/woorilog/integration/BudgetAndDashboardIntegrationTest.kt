package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.domain.CategoryType
import com.woorilog.service.*
import org.hamcrest.Matchers.*
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.YearMonth

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BudgetAndDashboardIntegrationTest {

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

    private fun getCategories(ledgerId: Long, token: String): List<CategoryResponse> {
        val result = mockMvc.perform(get("/api/ledgers/$ledgerId/categories")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(
            result.response.contentAsString,
            objectMapper.typeFactory.constructCollectionType(List::class.java, CategoryResponse::class.java)
        )
    }

    @Test
    fun should_ManageBudgetMonth_When_Authorized() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id
        val userId = loginResponse.user.id
        val budgetMonth = "2026-07"

        val categories = getCategories(ledgerId, token)
        val foodCat = categories.first { it.name == "식비" }

        val fixedBudgetRequest = mapOf(
            "name" to "월세",
            "categoryId" to foodCat.id,
            "amount" to 500000,
            "active" to true,
        )
        val fixedBudgetResult = mockMvc.perform(post("/api/ledgers/$ledgerId/fixed-budgets")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(fixedBudgetRequest)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.name").value("월세"))
            .andExpect(jsonPath("$.amount").value(500000))
            .andReturn()
        val fixedBudgetId = objectMapper.readTree(fixedBudgetResult.response.contentAsString)["id"].asLong()

        // 1. Initial GET before settings are saved -> should return default budget settings populated with ledger categories/members
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/$budgetMonth")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.ledgerId").value(ledgerId))
            .andExpect(jsonPath("$.budgetMonth").value(budgetMonth))
            .andExpect(jsonPath("$.totalBudgetAmount").value(0))
            .andExpect(jsonPath("$.fixedBudgetTotalAmount").value(500000))
            .andExpect(jsonPath("$.categoryBudgets[?(@.categoryId == ${foodCat.id})].amount").value(500000))
            .andExpect(jsonPath("$.closed").value(false))
            .andExpect(jsonPath("$.categoryBudgets", hasSize<Any>(categories.size)))
            .andExpect(jsonPath("$.memberAllocations", hasSize<Any>(1)))
            .andExpect(jsonPath("$.memberAllocations[0].userId").value(userId))
            .andExpect(jsonPath("$.memberAllocations[0].amount").value(0))

        mockMvc.perform(put("/api/fixed-budgets/$fixedBudgetId")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(fixedBudgetRequest + ("active" to false))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.active").value(false))

        mockMvc.perform(get("/api/ledgers/$ledgerId/fixed-budgets")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/fixed-budgets/$fixedBudgetId")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isNoContent)

        // 2. PUT budget month settings
        val putRequest = mapOf(
            "totalBudgetAmount" to 1000000,
            "categoryBudgets" to listOf(
                mapOf("categoryId" to foodCat.id, "amount" to 400000)
            ),
            "memberAllocations" to listOf(
                mapOf("userId" to userId, "amount" to 600000)
            )
        )

        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$budgetMonth")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(putRequest)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudgetAmount").value(1000000))
            .andExpect(jsonPath("$.categoryBudgets[?(@.categoryId == ${foodCat.id})].amount").value(400000))
            .andExpect(jsonPath("$.memberAllocations[?(@.userId == $userId)].amount").value(600000))

        // 3. GET should return updated settings
        mockMvc.perform(get("/api/ledgers/$ledgerId/months/$budgetMonth")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudgetAmount").value(1000000))
            .andExpect(jsonPath("$.closed").value(false))

        // 4. Close the budget month
        mockMvc.perform(post("/api/ledgers/$ledgerId/months/$budgetMonth/close")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.closed").value(true))

        // 5. Updating a closed month should fail
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$budgetMonth")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(putRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

        // 6. Reopen the budget month
        mockMvc.perform(post("/api/ledgers/$ledgerId/months/$budgetMonth/reopen")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.closed").value(false))

        // 7. Update should succeed again
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$budgetMonth")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(putRequest)))
            .andExpect(status().isOk)
    }

    @Test
    fun should_UseOnlyMemberAllocations_ForGroupLedgerBudget() {
        val loginResponse = devLogin("group-budget@example.com", "공동 예산 사용자")
        val token = loginResponse.accessToken
        val groupLedger = objectMapper.readValue(
            mockMvc.perform(post("/api/ledgers/group")
                .header("Authorization", "Bearer $token")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mapOf("name" to "공동 예산 장부"))))
                .andExpect(status().isOk)
                .andReturn().response.contentAsString,
            LedgerDto::class.java,
        )
        val categories = getCategories(groupLedger.id, token)
        val foodCategory = categories.first { it.name == "식비" }
        val request = mapOf(
            "totalBudgetAmount" to 500_000,
            "categoryBudgets" to listOf(mapOf("categoryId" to foodCategory.id, "amount" to 300_000)),
            "memberAllocations" to listOf(mapOf("userId" to loginResponse.user.id, "amount" to 500_000)),
        )

        mockMvc.perform(put("/api/ledgers/${groupLedger.id}/months/2026-07")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudgetAmount").value(500_000))
            .andExpect(jsonPath("$.categoryBudgets", hasSize<Any>(0)))
            .andExpect(jsonPath("$.fixedBudgetTotalAmount").value(0))
            .andExpect(jsonPath("$.memberAllocations[0].amount").value(500_000))

        mockMvc.perform(get("/api/ledgers/${groupLedger.id}/months/2026-07")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.categoryBudgets", hasSize<Any>(0)))
            .andExpect(jsonPath("$.memberAllocations[0].amount").value(500_000))
    }

    @Test
    fun should_ValidateBudgetInputs_When_Invalid() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id
        val userId = loginResponse.user.id

        val categories = getCategories(ledgerId, token)
        val foodCat = categories.first { it.name == "식비" }

        // Test 1: Negative total budget
        val negativeTotalRequest = mapOf(
            "totalBudgetAmount" to -100000,
            "categoryBudgets" to listOf(
                mapOf("categoryId" to foodCat.id, "amount" to 100000)
            ),
            "memberAllocations" to emptyList<Any>()
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/2026-07")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(negativeTotalRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

        // Test 2: Negative category budget amount
        val negativeCategoryRequest = mapOf(
            "totalBudgetAmount" to 500000,
            "categoryBudgets" to listOf(
                mapOf("categoryId" to foodCat.id, "amount" to -10000)
            ),
            "memberAllocations" to emptyList<Any>()
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/2026-07")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(negativeCategoryRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))

        // Test 3: Invalid month format
        val validPutRequest = mapOf(
            "totalBudgetAmount" to 500000,
            "categoryBudgets" to emptyList<Any>(),
            "memberAllocations" to emptyList<Any>()
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/2026-13")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(validPutRequest)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
    }

    @Test
    fun should_ReturnCorrectDashboardSummary_When_TransactionsExist() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id
        val userId = loginResponse.user.id

        val categories = getCategories(ledgerId, token)
        val foodCat = categories.first { it.name == "식비" }
        val cafeCat = categories.first { it.name == "카페" }
        val salaryCat = categories.first { it.name == "급여" }

        val currentMonth = YearMonth.now()
        val budgetMonthStr = currentMonth.toString()

        // 1. Set budget month
        val putRequest = mapOf(
            "totalBudgetAmount" to 1000000,
            "categoryBudgets" to listOf(
                mapOf("categoryId" to foodCat.id, "amount" to 300000),
                mapOf("categoryId" to cafeCat.id, "amount" to 100000)
            ),
            "memberAllocations" to listOf(
                mapOf("userId" to userId, "amount" to 400000)
            )
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$budgetMonthStr")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(putRequest)))
            .andExpect(status().isOk)

        // 2. Create transactions in current month
        val exp1 = mapOf(
            "type" to "EXPENSE", "amount" to 30000, "transactionDate" to currentMonth.atDay(5).toString(),
            "categoryId" to foodCat.id, "memo" to "Lunch", "payerUserId" to null
        )
        val exp2 = mapOf(
            "type" to "EXPENSE", "amount" to 15000, "transactionDate" to currentMonth.atDay(10).toString(),
            "categoryId" to cafeCat.id, "memo" to "Coffee", "payerUserId" to null
        )
        val inc1 = mapOf(
            "type" to "INCOME", "amount" to 200000, "transactionDate" to currentMonth.atDay(12).toString(),
            "categoryId" to salaryCat.id, "memo" to "Bonus", "payerUserId" to null
        )

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(exp1)))
            .andExpect(status().isOk)

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(exp2)))
            .andExpect(status().isOk)

        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(inc1)))
            .andExpect(status().isOk)

        // 3. Call GET /api/dashboard/current
        mockMvc.perform(get("/api/dashboard/current")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.currentLedger.id").value(ledgerId))
            .andExpect(jsonPath("$.budgetMonth").value(budgetMonthStr))
            .andExpect(jsonPath("$.totalBudgetAmount").value(1000000))
            // totalExpenseAmount should only count EXPENSE = 30000 + 15000 = 45000
            .andExpect(jsonPath("$.totalExpenseAmount").value(45000))
            .andExpect(jsonPath("$.scheduledRecurringExpenseAmount").value(0))
            .andExpect(jsonPath("$.remainingBudgetAmount").value(955000))
            .andExpect(jsonPath("$.recentTransactions", hasSize<Any>(3)))
            // categorySpending
            .andExpect(jsonPath("$.categorySpending[?(@.name == '식비')].totalSpent").value(45000))
            // memberSpending
            .andExpect(jsonPath("$.memberSpending[0].totalSpent").value(45000))
    }

    @Test
    fun should_ReserveScheduledRecurringExpense_AndAvoidDoubleCountingAfterGeneration() {
        val loginResponse = devLogin("scheduled-recurring@example.com", "예정 정기비")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id
        val scheduledMonth = YearMonth.now().plusMonths(1)
        val scheduledMonthStr = scheduledMonth.toString()
        val scheduledDate = scheduledMonth.atDay(5)

        val budgetRequest = mapOf(
            "totalBudgetAmount" to 1_000_000,
            "categoryBudgets" to emptyList<Any>(),
            "memberAllocations" to emptyList<Any>(),
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/$scheduledMonthStr")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(budgetRequest)))
            .andExpect(status().isOk)

        val recurringRequest = mapOf(
            "type" to "EXPENSE",
            "amount" to 40_000,
            "categoryId" to null,
            "memo" to "예정 구독료",
            "payerUserId" to null,
            "frequency" to "MONTHLY",
            "startDate" to scheduledDate.toString(),
            "endDate" to null,
        )
        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(recurringRequest)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.nextDueDate").value(scheduledDate.toString()))

        mockMvc.perform(get("/api/dashboard/current")
            .header("Authorization", "Bearer $token")
            .param("budgetMonth", scheduledMonthStr))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalExpenseAmount").value(0))
            .andExpect(jsonPath("$.scheduledRecurringExpenseAmount").value(40_000))
            .andExpect(jsonPath("$.remainingBudgetAmount").value(960_000))

        mockMvc.perform(post("/api/ledgers/$ledgerId/recurring-transactions/generate")
            .header("Authorization", "Bearer $token")
            .param("asOf", scheduledDate.toString()))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(1)))

        mockMvc.perform(get("/api/dashboard/current")
            .header("Authorization", "Bearer $token")
            .param("budgetMonth", scheduledMonthStr))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalExpenseAmount").value(40_000))
            .andExpect(jsonPath("$.scheduledRecurringExpenseAmount").value(0))
            .andExpect(jsonPath("$.remainingBudgetAmount").value(960_000))
    }

    @Test
    fun should_ReturnMonthlyStatistics_When_Queried() {
        val loginResponse = devLogin("user-a@example.com", "유저A")
        val token = loginResponse.accessToken
        val ledgerId = loginResponse.currentLedger.id

        val categories = getCategories(ledgerId, token)
        val foodCat = categories.first { it.name == "식비" }
        val salaryCat = categories.first { it.name == "급여" }

        // Set budget for 2026-06 and 2026-07
        val budgetJune = mapOf(
            "totalBudgetAmount" to 500000,
            "categoryBudgets" to emptyList<Any>(),
            "memberAllocations" to emptyList<Any>()
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/2026-06")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(budgetJune)))
            .andExpect(status().isOk)

        val budgetJuly = mapOf(
            "totalBudgetAmount" to 1200000,
            "categoryBudgets" to emptyList<Any>(),
            "memberAllocations" to emptyList<Any>()
        )
        mockMvc.perform(put("/api/ledgers/$ledgerId/months/2026-07")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(budgetJuly)))
            .andExpect(status().isOk)

        // Transactions in June
        val txJuneExp = mapOf(
            "type" to "EXPENSE", "amount" to 80000, "transactionDate" to "2026-06-10",
            "categoryId" to foodCat.id, "memo" to "Lunch June", "payerUserId" to null
        )
        val txJuneInc = mapOf(
            "type" to "INCOME", "amount" to 40000, "transactionDate" to "2026-06-12",
            "categoryId" to salaryCat.id, "memo" to "Bonus June", "payerUserId" to null
        )
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(txJuneExp)))
            .andExpect(status().isOk)
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(txJuneInc)))
            .andExpect(status().isOk)

        // Transactions in July
        val txJulyExp = mapOf(
            "type" to "EXPENSE", "amount" to 250000, "transactionDate" to "2026-07-05",
            "categoryId" to foodCat.id, "memo" to "Lunch July", "payerUserId" to null
        )
        val txJulyInc = mapOf(
            "type" to "INCOME", "amount" to 500000, "transactionDate" to "2026-07-15",
            "categoryId" to salaryCat.id, "memo" to "Bonus July", "payerUserId" to null
        )
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(txJulyExp)))
            .andExpect(status().isOk)
        mockMvc.perform(post("/api/ledgers/$ledgerId/transactions")
            .header("Authorization", "Bearer $token")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(txJulyInc)))
            .andExpect(status().isOk)

        // Get monthly stats for 2026-06 to 2026-07
        mockMvc.perform(get("/api/ledgers/$ledgerId/statistics/monthly?from=2026-06&to=2026-07")
            .header("Authorization", "Bearer $token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$", hasSize<Any>(2)))
            .andExpect(jsonPath("$[0].month").value("2026-06"))
            .andExpect(jsonPath("$[0].totalBudgetAmount").value(500000))
            .andExpect(jsonPath("$[0].totalExpenseAmount").value(80000))
            .andExpect(jsonPath("$[0].totalIncomeAmount").value(40000))
            .andExpect(jsonPath("$[1].month").value("2026-07"))
            .andExpect(jsonPath("$[1].totalBudgetAmount").value(1200000))
            .andExpect(jsonPath("$[1].totalExpenseAmount").value(250000))
            .andExpect(jsonPath("$[1].totalIncomeAmount").value(500000))
    }
}
