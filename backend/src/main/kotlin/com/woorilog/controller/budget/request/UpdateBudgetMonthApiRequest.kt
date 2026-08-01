package com.woorilog.controller.budget.request

import com.woorilog.application.budget.command.BudgetMonthCategoryCommand
import com.woorilog.application.budget.command.BudgetMonthMemberAllocationCommand
import com.woorilog.application.budget.command.UpdateBudgetMonthCommand

data class UpdateBudgetMonthApiRequest(
    val totalBudgetAmount: Long,
    val categoryBudgets: List<BudgetMonthCategoryApiRequest>,
    val memberAllocations: List<BudgetMonthMemberAllocationApiRequest>
) {
    fun toCommand() = UpdateBudgetMonthCommand(
        totalBudgetAmount = totalBudgetAmount,
        categoryBudgets = categoryBudgets.map { BudgetMonthCategoryCommand(it.categoryId, it.amount) },
        memberAllocations = memberAllocations.map { BudgetMonthMemberAllocationCommand(it.userId, it.amount) },
    )
}

data class BudgetMonthCategoryApiRequest(
    val categoryId: Long,
    val amount: Long
)

data class BudgetMonthMemberAllocationApiRequest(
    val userId: Long,
    val amount: Long
)
