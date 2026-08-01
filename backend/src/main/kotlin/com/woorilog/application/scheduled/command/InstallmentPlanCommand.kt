package com.woorilog.application.scheduled.command

import com.woorilog.domain.transaction.entity.BudgetSource
import com.woorilog.domain.transaction.entity.V1PaymentMethod
import java.time.LocalDate

data class InstallmentPlanCommand(
    val name: String,
    val totalPrincipal: Long,
    val months: Int,
    val monthlyInterest: Long,
    val merchant: String?,
    val memo: String?,
    val categoryId: Long,
    val budgetSource: BudgetSource,
    val firstDueDate: LocalDate,
    val paymentMethod: V1PaymentMethod?,
)
