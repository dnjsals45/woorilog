package com.woorilog.controller.scheduled.response

import com.woorilog.application.scheduled.result.RecurringTransactionDueResult
import com.woorilog.application.scheduled.result.RecurringTransactionTemplateResult
import com.woorilog.controller.transaction.response.CategorySummary
import com.woorilog.controller.transaction.response.PayerSummary
import com.woorilog.controller.transaction.response.toResponse
import com.woorilog.domain.category.entity.CategoryType
import com.woorilog.domain.scheduled.entity.RecurringFrequency
import java.time.LocalDate

data class RecurringTransactionTemplateResponse(
    val id: Long,
    val ledgerId: Long,
    val type: CategoryType,
    val amount: Long,
    val category: CategorySummary?,
    val payer: PayerSummary,
    val memo: String?,
    val frequency: RecurringFrequency,
    val startDate: LocalDate,
    val nextDueDate: LocalDate,
    val endDate: LocalDate?,
    val paused: Boolean
)

fun RecurringTransactionTemplateResult.toResponse() = RecurringTransactionTemplateResponse(
    id = id,
    ledgerId = ledgerId,
    type = type,
    amount = amount,
    category = category?.toResponse(),
    payer = payer.toResponse(),
    memo = memo,
    frequency = frequency,
    startDate = startDate,
    nextDueDate = nextDueDate,
    endDate = endDate,
    paused = paused,
)

data class RecurringTransactionDueResponse(
    val template: RecurringTransactionTemplateResponse,
    val dueDate: LocalDate
)

fun RecurringTransactionDueResult.toResponse() = RecurringTransactionDueResponse(
    template = template.toResponse(),
    dueDate = dueDate,
)
