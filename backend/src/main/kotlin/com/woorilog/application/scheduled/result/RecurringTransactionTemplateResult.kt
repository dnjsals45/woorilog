package com.woorilog.application.scheduled.result

import com.woorilog.application.transaction.result.CategorySummaryResult
import com.woorilog.application.transaction.result.PayerSummaryResult
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.scheduled.entity.RecurringFrequency
import com.woorilog.domain.scheduled.entity.RecurringTransactionTemplate
import java.time.LocalDate

data class RecurringTransactionTemplateResult(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val category: CategorySummaryResult?,
    val payer: PayerSummaryResult,
    val memo: String?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val nextDueDate: LocalDate,
    val endDate: LocalDate?,
    val paused: Boolean
)

data class RecurringTransactionDueResult(
    val template: RecurringTransactionTemplateResult,
    val dueDate: LocalDate
)

fun RecurringTransactionTemplate.toResult() = RecurringTransactionTemplateResult(
    id = this.id!!,
    ledgerId = this.ledger.id!!,
    type = this.type,
    amount = this.amount,
    category = this.category?.let { CategorySummaryResult(it.id!!, it.name, it.type) },
    payer = PayerSummaryResult(this.payer.id!!, this.payer.nickname),
    memo = this.memo,
    frequency = this.frequency,
    startDate = this.startDate,
    nextDueDate = this.nextDueDate,
    endDate = this.endDate,
    paused = this.paused
)
