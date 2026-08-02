package com.woorilog.integration

import com.fasterxml.jackson.databind.ObjectMapper
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
import com.woorilog.domain.transaction.policy.TransferType
import com.woorilog.domain.transaction.repository.TransactionRepository
import com.woorilog.application.budget.service.BudgetAutomationService
import com.woorilog.controller.auth.response.DevLoginResponse
import com.woorilog.application.analytics.service.V1InsightsService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class V1InsightsAutomationIntegrationTest {
    @Autowired lateinit var mockMvc: MockMvc
    @Autowired lateinit var objectMapper: ObjectMapper
    @Autowired lateinit var periodRepository: BudgetPeriodRepository
    @Autowired lateinit var allocationRepository: BudgetAllocationRepository
    @Autowired lateinit var categoryRepository: LedgerCategoryRepository
    @Autowired lateinit var transactionRepository: TransactionRepository
    @Autowired lateinit var notificationRepository: UserNotificationRepository
    @Autowired lateinit var insights: V1InsightsService
    @Autowired lateinit var automation: BudgetAutomationService

    @Test
    fun should_ExcludeIncomeAndNonExpenseTransfersFromAnalyticsAndReenterThreshold() {
        val login = login("insights@example.com")
        val period = periodRepository.findByLedgerIdOrderByStartDateDesc(login.currentLedger.id).first()
        val allocation = allocationRepository.findByBudgetPeriodIdOrderById(period.id!!).single().also { it.amount = 100 }
        val category = categoryRepository.findByLedgerIdOrderBySortOrderAsc(login.currentLedger.id).first { it.type == CategoryType.EXPENSE }
        val user = allocation.owner!!
        fun save(type: CategoryType, amount: Long, transfer: TransferType? = null) = transactionRepository.save(Transaction(
            ledger = period.ledger, category = category, payer = user, type = type, amount = amount, transactionDate = LocalDate.now(), memo = null,
            recorder = user, budgetAllocation = allocation, transferType = transfer, merchant = "검증", scopeType = BudgetScopeType.PERSONAL,
            scopeOwnerUserId = user.id, categoryGroupCode = category.categoryGroup.code, categoryGroupName = category.categoryGroup.name, categoryName = category.name,
        ))
        val expense = save(CategoryType.EXPENSE, 60)
        save(CategoryType.TRANSFER, 30, TransferType.OUTBOUND)
        save(CategoryType.INCOME, 500)
        save(CategoryType.TRANSFER, 40, TransferType.OWN_ACCOUNTS)
        save(CategoryType.TRANSFER, 50, TransferType.INBOUND)

        val analytics = insights.analytics(user.id!!, period.ledger.id!!, period.startDate, com.woorilog.domain.transaction.policy.AnalyticsScope.ALL)
        assertEquals(90, analytics.totalExpenseAmount)

        automation.evaluatePeriod(period.id!!)
        assertEquals(1, notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(user.id!!).count { it.type == NotificationType.BUDGET_THRESHOLD_80 })
        automation.evaluatePeriod(period.id!!)
        assertEquals(1, notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(user.id!!).count { it.type == NotificationType.BUDGET_THRESHOLD_80 })
        transactionRepository.delete(expense)
        automation.evaluatePeriod(period.id!!)
        save(CategoryType.EXPENSE, 60)
        automation.evaluatePeriod(period.id!!)
        assertEquals(2, notificationRepository.findTop50ByUserIdOrderByCreatedAtDesc(user.id!!).count { it.type == NotificationType.BUDGET_THRESHOLD_80 })
    }
    @Test
    fun should_ComputeCategoryPreviousAmount_OnlyWhenPreviousPeriodExists() {
        val login = login("insights-previous@example.com")
        val currentPeriod = periodRepository.findByLedgerIdOrderByStartDateDesc(login.currentLedger.id).first()
        val allocation = allocationRepository.findByBudgetPeriodIdOrderById(currentPeriod.id!!).single()
        val category = categoryRepository.findByLedgerIdOrderBySortOrderAsc(login.currentLedger.id).first { it.type == CategoryType.EXPENSE }
        val user = allocation.owner!!

        fun saveExpense(period: BudgetPeriod, targetAllocation: BudgetAllocation, amount: Long) = transactionRepository.save(Transaction(
            ledger = period.ledger, category = category, payer = user, type = CategoryType.EXPENSE, amount = amount, transactionDate = period.startDate, memo = null,
            recorder = user, budgetAllocation = targetAllocation, transferType = null, merchant = "검증", scopeType = BudgetScopeType.PERSONAL,
            scopeOwnerUserId = user.id, categoryGroupCode = category.categoryGroup.code, categoryGroupName = category.categoryGroup.name, categoryName = category.name,
        ))
        saveExpense(currentPeriod, allocation, 60)

        // No previous period yet: previousAmount stays null for every category, including this one.
        val withoutPrevious = insights.analytics(user.id!!, login.currentLedger.id, currentPeriod.startDate, com.woorilog.domain.transaction.policy.AnalyticsScope.ALL)
        val distributionWithoutPrevious = withoutPrevious.categoryDistribution.first { it.groupCode == category.categoryGroup.code }
        assertEquals(60, distributionWithoutPrevious.amount)
        assertEquals(null, distributionWithoutPrevious.previousAmount)

        // Add a previous period with spending in the same category.
        val previousPeriod = periodRepository.save(BudgetPeriod(
            ledger = currentPeriod.ledger,
            startDate = currentPeriod.startDate.minusMonths(1),
            endDate = currentPeriod.startDate.minusDays(1),
            totalBudgetAmount = currentPeriod.totalBudgetAmount,
        ))
        val previousAllocation = allocationRepository.save(BudgetAllocation(previousPeriod, BudgetAllocationScope.PERSONAL, user, 100))
        saveExpense(previousPeriod, previousAllocation, 40)

        val withPrevious = insights.analytics(user.id!!, login.currentLedger.id, currentPeriod.startDate, com.woorilog.domain.transaction.policy.AnalyticsScope.ALL)
        val distributionWithPrevious = withPrevious.categoryDistribution.first { it.groupCode == category.categoryGroup.code }
        assertEquals(60, distributionWithPrevious.amount)
        assertEquals(40, distributionWithPrevious.previousAmount)
    }

    private fun login(email: String): DevLoginResponse {
        val result = mockMvc.perform(post("/api/auth/dev-login").contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(mapOf("email" to email, "nickname" to "분석 사용자")))).andExpect(status().isOk).andReturn()
        return objectMapper.readValue(result.response.contentAsString, DevLoginResponse::class.java)
    }
}
