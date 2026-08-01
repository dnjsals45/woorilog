package com.woorilog.controller.budget.response

import com.woorilog.application.budget.result.FixedBudgetResult

data class FixedBudgetResponse(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val categoryId: Long,
    val categoryName: String,
    val amount: Long,
    val active: Boolean,
)

fun FixedBudgetResult.toResponse() = FixedBudgetResponse(
    id = id,
    ledgerId = ledgerId,
    name = name,
    categoryId = categoryId,
    categoryName = categoryName,
    amount = amount,
    active = active,
)
