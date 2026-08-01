package com.woorilog.application.budget.command

data class UpdateBudgetMonthCommand(
    val totalBudgetAmount: Long,
    val categoryBudgets: List<BudgetMonthCategoryCommand>,
    val memberAllocations: List<BudgetMonthMemberAllocationCommand>
)

data class BudgetMonthCategoryCommand(
    val categoryId: Long,
    val amount: Long
)

data class BudgetMonthMemberAllocationCommand(
    val userId: Long,
    val amount: Long
)
