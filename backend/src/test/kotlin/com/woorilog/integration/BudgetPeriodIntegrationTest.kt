package com.woorilog.integration

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.ObjectMapper
import com.woorilog.controller.auth.response.DevLoginResponse
import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.entity.BudgetPeriod
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.category.repository.LedgerCategoryRepository
import com.woorilog.domain.notification.entity.NotificationType
import com.woorilog.domain.notification.repository.UserNotificationRepository
import com.woorilog.domain.transaction.entity.Transaction
import com.woorilog.domain.transaction.policy.BudgetScopeType
import com.woorilog.domain.transaction.repository.TransactionRepository
import org.hamcrest.Matchers.hasSize
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

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BudgetPeriodIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var notificationRepository: UserNotificationRepository

    @Autowired
    private lateinit var periodRepository: BudgetPeriodRepository

    @Autowired
    private lateinit var allocationRepository: BudgetAllocationRepository

    @Autowired
    private lateinit var categoryRepository: LedgerCategoryRepository

    @Autowired
    private lateinit var transactionRepository: TransactionRepository

    @Test
    fun should_CreateAndConfigureSharedLedgerBudgetPeriodAndTransferReserve() {
        val login = devLogin("budget-period@example.com", "예산설정자")
        val created = mockMvc.perform(post("/api/ledgers/shared")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "name" to "우리 생활비",
                "totalBudget" to 2_000_000,
                "budgetCycle" to mapOf("startType" to "DAY_OF_MONTH", "startDay" to 10),
            ))))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.ledger.name").value("우리 생활비"))
            .andExpect(jsonPath("$.currentBudgetPeriod.totalBudget").value(2_000_000))
            .andExpect(jsonPath("$.currentBudgetPeriod.allocations", hasSize<Any>(0)))
            .andExpect(jsonPath("$.currentBudgetPeriod.reserveAmount").value(null))
            .andExpect(jsonPath("$.currentBudgetPeriod.prepared").value(false))
            .andReturn()

        val currentPeriod = body(created)
            .path("currentBudgetPeriod")
        val ledgerId = body(created).path("ledger").path("id").asLong()
        val startDate = LocalDate.parse(currentPeriod.path("startDate").asText())
        val endDate = LocalDate.parse(currentPeriod.path("endDate").asText())
        assertEquals(10, startDate.dayOfMonth)
        assertEquals(startDate.plusMonths(1).minusDays(1), endDate)

        val configure = mapOf(
            "totalBudget" to 2_000_000,
            "personalAllocations" to listOf(mapOf("userId" to login.user.id, "amount" to 400_000)),
            "sharedAllocation" to 1_000_000,
            "increaseTotalBudgetIfNeeded" to false,
            "applyToFutureDefaults" to false,
        )
        val periodPath = "/api/ledgers/$ledgerId/budget-periods/$startDate"
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(configure)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudget").value(2_000_000))
            .andExpect(jsonPath("$.allocations", hasSize<Any>(2)))
            .andExpect(jsonPath("$.reserveAmount").value(600_000))
            .andExpect(jsonPath("$.prepared").value(true))

        assertEquals(
            0,
            notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(login.user.id!!).count { it.type == NotificationType.BUDGET_CHANGED },
            "최초 예산 설정은 변경 알림을 발행하지 않아야 합니다.",
        )

        val overAllocated = configure + mapOf("totalBudget" to 1_300_000)
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(overAllocated)))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("TOTAL_BUDGET_INCREASE_CONFIRMATION_REQUIRED"))

        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(overAllocated + mapOf("increaseTotalBudgetIfNeeded" to true))))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.totalBudget").value(1_400_000))
            .andExpect(jsonPath("$.reserveAmount").value(0))

        assertEquals(
            1,
            notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(login.user.id!!).count { it.type == NotificationType.BUDGET_CHANGED },
            "전체 예산 금액이 바뀌면 BUDGET_CHANGED 알림이 발행되어야 합니다.",
        )

        mockMvc.perform(post("$periodPath/reserve-transfers")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "amount" to 100_000,
                "target" to mapOf("type" to "SHARED", "ownerUserId" to null),
            ))))
            .andExpect(status().isConflict)
            .andExpect(jsonPath("$.code").value("INSUFFICIENT_RESERVE"))

        val increasedTotal = configure + mapOf(
            "totalBudget" to 2_000_000,
            "increaseTotalBudgetIfNeeded" to false,
        )
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(increasedTotal)))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.reserveAmount").value(600_000))

        mockMvc.perform(post("$periodPath/reserve-transfers")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf(
                "amount" to 100_000,
                "target" to mapOf("type" to "SHARED", "ownerUserId" to null),
            ))))
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.transfer.amount").value(100_000))
            .andExpect(jsonPath("$.period.reserveAmount").value(500_000))
            .andExpect(jsonPath("$.period.allocations[?(@.source.type == 'SHARED')].amount").value(1_100_000))

        assertEquals(
            1,
            notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(login.user.id!!).count { it.type == NotificationType.RESERVE_TRANSFER },
            "예비비 이동이 성공하면 RESERVE_TRANSFER 알림이 발행되어야 합니다.",
        )

        mockMvc.perform(put("/api/ledgers/$ledgerId/budget-periods/${startDate.plusDays(1)}")
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(configure)))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.code").value("INVALID_BUDGET_PERIOD_START"))
    }

    @Test
    fun should_ComputePreviousSpentAmount_ForCategoryBudget_OnlyWhenPreviousPeriodAndAllocationExist() {
        val login = devLogin("budget-period-previous@example.com", "이전기간사용자")
        val ledgerId = login.currentLedger.id
        val userId = login.user.id!!
        val currentPeriod = periodRepository.findByLedgerIdOrderByStartDateDesc(ledgerId).first()
        val category = categoryRepository.findByLedgerIdOrderBySortOrderAsc(ledgerId).first { it.type == CategoryType.EXPENSE }
        val groupCode = category.categoryGroup.code

        val configure = mapOf(
            "totalBudget" to 500_000,
            "personalAllocations" to listOf(mapOf("userId" to userId, "amount" to 500_000)),
            "sharedAllocation" to 0,
            "categoryBudgets" to listOf(
                mapOf(
                    "source" to mapOf("type" to "PERSONAL", "ownerUserId" to userId),
                    "groupCode" to groupCode,
                    "amount" to 200_000,
                ),
            ),
            "increaseTotalBudgetIfNeeded" to false,
            "applyToFutureDefaults" to false,
        )
        val periodPath = "/api/ledgers/$ledgerId/budget-periods/${currentPeriod.startDate}"
        mockMvc.perform(put(periodPath)
            .header("Authorization", "Bearer ${login.accessToken}")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(configure)))
            .andExpect(status().isOk)

        // No previous period yet: previousSpentAmount is null for the category budget.
        mockMvc.perform(get(periodPath).header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.categoryBudgets[?(@.groupCode == '$groupCode')].previousSpentAmount").value(org.hamcrest.Matchers.contains(null as Any?)))

        // Add a previous period with an allocation and spending in the same category.
        val allocation = allocationRepository.findByBudgetPeriodIdOrderById(currentPeriod.id!!)
            .single { it.scope == BudgetAllocationScope.PERSONAL && it.owner?.id == userId }
        val previousPeriod = periodRepository.save(BudgetPeriod(
            ledger = currentPeriod.ledger,
            startDate = currentPeriod.startDate.minusMonths(1),
            endDate = currentPeriod.startDate.minusDays(1),
            totalBudgetAmount = 500_000,
        ))
        val previousAllocation = allocationRepository.save(BudgetAllocation(previousPeriod, BudgetAllocationScope.PERSONAL, allocation.owner, 500_000))
        transactionRepository.save(Transaction(
            ledger = previousPeriod.ledger, category = category, payer = allocation.owner!!, type = CategoryType.EXPENSE, amount = 150_000,
            transactionDate = previousPeriod.startDate, memo = null, recorder = allocation.owner!!, budgetAllocation = previousAllocation,
            transferType = null, merchant = "검증", scopeType = BudgetScopeType.PERSONAL, scopeOwnerUserId = userId,
            categoryGroupCode = groupCode, categoryGroupName = category.categoryGroup.name, categoryName = category.name,
        ))

        mockMvc.perform(get(periodPath).header("Authorization", "Bearer ${login.accessToken}"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.categoryBudgets[?(@.groupCode == '$groupCode')].previousSpentAmount").value(150_000))
    }

    private fun devLogin(email: String, nickname: String): DevLoginResponse {
        val result = mockMvc.perform(post("/api/auth/dev-login")
            .contentType(MediaType.APPLICATION_JSON)
            .content(json(mapOf("email" to email, "nickname" to nickname))))
            .andExpect(status().isOk)
            .andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }

    private fun body(result: org.springframework.test.web.servlet.MvcResult): JsonNode =
        objectMapper.readTree(result.response.contentAsString)

    private fun json(value: Any): String = objectMapper.writeValueAsString(value)
}
