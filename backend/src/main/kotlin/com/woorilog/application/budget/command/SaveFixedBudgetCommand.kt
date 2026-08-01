package com.woorilog.application.budget.command

data class SaveFixedBudgetCommand(
    val name: String,
    val categoryId: Long,
    val amount: Long,
    val active: Boolean = true,
)
