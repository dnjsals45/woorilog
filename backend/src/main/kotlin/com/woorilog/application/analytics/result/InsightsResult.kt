package com.woorilog.application.analytics.result

import com.woorilog.application.budget.result.BudgetPeriodDetailResponse
import com.woorilog.application.budget.result.BudgetSourceResponse
import com.woorilog.application.transaction.result.TransactionResult
import com.woorilog.domain.transaction.policy.AnalyticsScope
import java.time.LocalDate

data class V1CategorySpendingResponse(val groupCode: String, val groupName: String, val amount: Long)
data class BudgetPeriodSummaryResponse(val period: BudgetPeriodDetailResponse, val categorySpending: List<V1CategorySpendingResponse>, val unclassifiedCount: Int, val nextPeriodScheduledAmount: Long)
data class DailySpendingResponse(val date: LocalDate, val amount: Long)
data class AllocationDetailResponse(val allocationId: Long, val source: BudgetSourceResponse, val amount: Long, val spentAmount: Long, val currentBalance: Long, val scheduledAmount: Long, val availableAmount: Long, val categorySpending: List<V1CategorySpendingResponse>, val dailySpending: List<DailySpendingResponse>, val transactions: List<TransactionResult>, val nextCursor: String?)
data class DailyCumulativeResponse(val date: LocalDate, val amount: Long, val cumulativeAmount: Long)
data class PeriodTrendResponse(val startDate: LocalDate, val endDate: LocalDate, val expenseAmount: Long)
// previousAmount is null only when there is no previous budget period to compare against (e.g. the
// ledger's first period). When a previous period exists but had no spending in this category, it is 0.
data class V1CategorySpendingWithComparisonResponse(val groupCode: String, val groupName: String, val amount: Long, val previousAmount: Long?)
data class AnalyticsResponse(val periodStart: LocalDate, val periodEnd: LocalDate, val scope: AnalyticsScope, val totalExpenseAmount: Long, val previousPeriodExpenseAmount: Long?, val changeAmount: Long?, val categoryDistribution: List<V1CategorySpendingWithComparisonResponse>, val dailyFlow: List<DailyCumulativeResponse>, val trend: List<PeriodTrendResponse>)
