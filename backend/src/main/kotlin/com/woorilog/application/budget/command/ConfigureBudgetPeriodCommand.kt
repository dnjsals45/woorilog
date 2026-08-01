package com.woorilog.application.budget.command

import com.woorilog.application.budget.result.BudgetSourceResponse

data class ConfigureBudgetPeriodCommand(
    val totalBudget: Long,
    val personalAllocations: List<PersonalAllocationInput>,
    val sharedAllocation: Long,
    val categoryBudgets: List<CategoryBudgetInput>,
    val increaseTotalBudgetIfNeeded: Boolean,
    val applyToFutureDefaults: Boolean,
)

data class PersonalAllocationInput(val userId: Long, val amount: Long)
data class CategoryBudgetInput(val source: BudgetSourceResponse, val groupCode: String, val amount: Long)
