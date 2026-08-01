package com.woorilog.controller.analytics.response

import com.woorilog.application.analytics.result.MonthlyStatisticsResult

data class MonthlyStatisticsResponse(
    val month: String,
    val totalBudgetAmount: Long,
    val totalExpenseAmount: Long,
    val totalIncomeAmount: Long,
    val categorySpending: List<CategorySpendingResponse>,
)

fun MonthlyStatisticsResult.toResponse() = MonthlyStatisticsResponse(
    month = month,
    totalBudgetAmount = totalBudgetAmount,
    totalExpenseAmount = totalExpenseAmount,
    totalIncomeAmount = totalIncomeAmount,
    categorySpending = categorySpending.map { it.toResponse() },
)
