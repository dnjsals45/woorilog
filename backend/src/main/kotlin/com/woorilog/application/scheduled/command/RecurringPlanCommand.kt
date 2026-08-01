package com.woorilog.application.scheduled.command

import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import com.woorilog.domain.scheduled.policy.ScheduleFrequency
import java.time.LocalDate

data class RecurringPlanCommand(
    val name: String,
    val amount: Long,
    val merchant: String?,
    val memo: String?,
    val categoryId: Long,
    val budgetSource: BudgetSource,
    val frequency: ScheduleFrequency,
    val startDate: LocalDate,
    val endDate: LocalDate?,
    val fixedExpense: Boolean,
    val paymentMethod: V1PaymentMethod?,
)
