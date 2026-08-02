package com.woorilog.controller.scheduled.request

import com.woorilog.application.scheduled.command.RecurringPlanCommand
import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import java.time.LocalDate

data class RecurringPlanApiRequest(
    val name: String,
    val amount: Long,
    val merchant: String?,
    val memo: String?,
    val categoryId: Long,
    val budgetSource: BudgetSource,
    val frequency: ScheduleFrequency,
    val startDate: LocalDate,
    val endDate: LocalDate?,
    val isFixedExpense: Boolean,
    val paymentMethod: V1PaymentMethod?,
) {
    fun toCommand() = RecurringPlanCommand(
        name = name,
        amount = amount,
        merchant = merchant,
        memo = memo,
        categoryId = categoryId,
        budgetSource = budgetSource,
        frequency = frequency,
        startDate = startDate,
        endDate = endDate,
        fixedExpense = isFixedExpense,
        paymentMethod = paymentMethod,
    )
}
