package com.woorilog.application.budget.result

import com.woorilog.domain.budget.entity.FixedBudgetTemplate

data class FixedBudgetResult(
    val id: Long,
    val ledgerId: Long,
    val name: String,
    val categoryId: Long,
    val categoryName: String,
    val amount: Long,
    val active: Boolean,
)

fun FixedBudgetTemplate.toResult() = FixedBudgetResult(
    id = id!!,
    ledgerId = ledger.id!!,
    name = name,
    categoryId = category.id!!,
    categoryName = category.name,
    amount = amount,
    active = active,
)
