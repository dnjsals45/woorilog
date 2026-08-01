package com.woorilog.application.analytics.result

import com.woorilog.application.auth.result.LedgerDto
import com.woorilog.application.ledger.result.LedgerSummaryResult
import com.woorilog.application.transaction.result.TransactionResult
import java.time.LocalDate

data class DashboardSummaryResult(
    val currentLedger: LedgerDto,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val scheduledRecurringExpenseAmount: Long,
    val remainingBudgetAmount: Long,
    val recentTransactions: List<TransactionResult>,
    val categorySpending: List<CategorySpendingResult>,
    val memberSpending: List<MemberSpendingResult>,
    val cardPaymentSummaries: List<CardPaymentSummaryResult>,
    val ledger: LedgerSummaryResult? = null,
    val period: DashboardPeriodResult? = null,
    val sharedBudget: DashboardBudgetResult? = null,
    val myBudget: DashboardBudgetResult? = null,
    val incomeAmount: Long? = null,
    val weeklyGuide: WeeklyGuideResult? = null,
    val emptyState: String? = null,
)

data class DashboardPeriodResult(val id: Long, val startDate: LocalDate, val endDate: LocalDate, val totalBudget: Long)
data class DashboardBudgetResult(val allocationId: Long, val amount: Long, val spentAmount: Long, val currentBalance: Long, val availableAmount: Long)
data class WeeklyGuideResult(val weekStartDate: LocalDate, val recommendedAmount: Long, val remainingOverageAmount: Long)

data class CardPaymentSummaryResult(
    val cardId: Long,
    val cardName: String,
    val statementClosingDate: LocalDate,
    val expectedPaymentMonth: String,
    val totalAmount: Long,
)

data class CategorySpendingResult(
    val categoryGroupId: Long,
    val name: String,
    val totalSpent: Long
)

data class MemberSpendingResult(
    val userId: Long,
    val nickname: String,
    val totalSpent: Long
)

data class MonthlyStatisticsResult(
    val month: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val totalIncomeAmount: Long,
    val categorySpending: List<CategorySpendingResult>,
)
