package com.woorilog.controller.analytics.response

import com.woorilog.application.analytics.result.CardPaymentSummaryResult
import com.woorilog.application.analytics.result.CategorySpendingResult
import com.woorilog.application.analytics.result.DashboardBudgetResult
import com.woorilog.application.analytics.result.DashboardPeriodResult
import com.woorilog.application.analytics.result.DashboardSummaryResult
import com.woorilog.application.analytics.result.MemberSpendingResult
import com.woorilog.application.analytics.result.WeeklyGuideResult
import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.controller.ledger.response.LedgerSummaryResponse
import com.woorilog.controller.ledger.response.toResponse
import com.woorilog.controller.transaction.response.TransactionResponse
import com.woorilog.controller.transaction.response.toResponse
import java.time.LocalDate

data class DashboardSummaryResponse(
    val currentLedger: LedgerDto,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val scheduledRecurringExpenseAmount: Long,
    val remainingBudgetAmount: Long,
    val recentTransactions: List<TransactionResponse>,
    val categorySpending: List<CategorySpendingResponse>,
    val memberSpending: List<MemberSpendingResponse>,
    val cardPaymentSummaries: List<CardPaymentSummaryResponse>,
    val ledger: LedgerSummaryResponse? = null,
    val period: DashboardPeriodResponse? = null,
    val sharedBudget: DashboardBudgetResponse? = null,
    val myBudget: DashboardBudgetResponse? = null,
    val incomeAmount: Long? = null,
    val weeklyGuide: WeeklyGuideResponse? = null,
    val emptyState: String? = null,
)

data class DashboardPeriodResponse(val id: Long, val startDate: LocalDate, val endDate: LocalDate, val totalBudget: Long)
data class DashboardBudgetResponse(val allocationId: Long, val amount: Long, val spentAmount: Long, val currentBalance: Long, val availableAmount: Long)
data class WeeklyGuideResponse(val weekStartDate: LocalDate, val recommendedAmount: Long, val remainingOverageAmount: Long)

data class CardPaymentSummaryResponse(
    val cardId: Long,
    val cardName: String,
    val statementClosingDate: LocalDate,
    val expectedPaymentMonth: String,
    val totalAmount: Long,
)

data class CategorySpendingResponse(
    val categoryGroupId: Long,
    val name: String,
    val totalSpent: Long
)

data class MemberSpendingResponse(
    val userId: Long,
    val nickname: String,
    val totalSpent: Long
)

fun DashboardPeriodResult.toResponse() = DashboardPeriodResponse(id, startDate, endDate, totalBudget)
fun DashboardBudgetResult.toResponse() = DashboardBudgetResponse(allocationId, amount, spentAmount, currentBalance, availableAmount)
fun WeeklyGuideResult.toResponse() = WeeklyGuideResponse(weekStartDate, recommendedAmount, remainingOverageAmount)
fun CardPaymentSummaryResult.toResponse() = CardPaymentSummaryResponse(cardId, cardName, statementClosingDate, expectedPaymentMonth, totalAmount)
fun CategorySpendingResult.toResponse() = CategorySpendingResponse(categoryGroupId, name, totalSpent)
fun MemberSpendingResult.toResponse() = MemberSpendingResponse(userId, nickname, totalSpent)

fun DashboardSummaryResult.toResponse() = DashboardSummaryResponse(
    currentLedger = currentLedger,
    budgetMonth = budgetMonth,
    totalBudgetAmount = totalBudgetAmount,
    totalExpenseAmount = totalExpenseAmount,
    scheduledRecurringExpenseAmount = scheduledRecurringExpenseAmount,
    remainingBudgetAmount = remainingBudgetAmount,
    recentTransactions = recentTransactions.map { it.toResponse() },
    categorySpending = categorySpending.map { it.toResponse() },
    memberSpending = memberSpending.map { it.toResponse() },
    cardPaymentSummaries = cardPaymentSummaries.map { it.toResponse() },
    ledger = ledger?.toResponse(),
    period = period?.toResponse(),
    sharedBudget = sharedBudget?.toResponse(),
    myBudget = myBudget?.toResponse(),
    incomeAmount = incomeAmount,
    weeklyGuide = weeklyGuide?.toResponse(),
    emptyState = emptyState,
)
