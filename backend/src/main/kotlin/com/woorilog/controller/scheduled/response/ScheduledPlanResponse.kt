package com.woorilog.controller.scheduled.response

import com.woorilog.application.scheduled.result.ScheduledPlanResult
import com.woorilog.controller.transaction.response.TransactionResponse
import com.woorilog.controller.transaction.response.toResponse
import com.woorilog.domain.scheduled.entity.ScheduledPlanStatus
import com.woorilog.domain.scheduled.entity.ScheduledPlanType
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import com.woorilog.domain.transaction.entity.BudgetSource
import java.time.LocalDate

data class ScheduledPlanResponse(
    val id: Long,
    val type: ScheduledPlanType,
    val name: String,
    val amount: Long,
    val frequency: ScheduleFrequency?,
    val status: ScheduledPlanStatus,
    val nextDueDate: LocalDate,
    val isFixedExpense: Boolean,
    val categoryId: Long?,
    val categoryName: String?,
    val budgetSource: BudgetSource?,
    val totalAmount: Long?,
    val round: Int?,
    val totalRounds: Int?,
    val principalAmount: Long?,
    val monthlyInterest: Long?,
    val firstTransaction: TransactionResponse? = null,
)

fun ScheduledPlanResult.toResponse() = ScheduledPlanResponse(
    id = id,
    type = type,
    name = name,
    amount = amount,
    frequency = frequency,
    status = status,
    nextDueDate = nextDueDate,
    isFixedExpense = isFixedExpense,
    categoryId = categoryId,
    categoryName = categoryName,
    budgetSource = budgetSource,
    totalAmount = totalAmount,
    round = round,
    totalRounds = totalRounds,
    principalAmount = principalAmount,
    monthlyInterest = monthlyInterest,
    firstTransaction = firstTransaction?.toResponse(),
)
