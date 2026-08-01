package com.woorilog.application.budget.result

import com.woorilog.domain.category.entity.CategoryType

data class BudgetMonthSettingsResult(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val fixedBudgetTotalAmount: Long,
    val closed: Boolean,
    val categoryBudgets: List<BudgetMonthCategoryBudgetResult>,
    val memberAllocations: List<BudgetMonthMemberAllocationResult>
)

data class BudgetMonthCategoryBudgetResult(
    val categoryId: Long,
    val name: String,
    val type: CategoryType,
    val categoryGroupId: Long,
    val categoryGroupName: String,
    val amount: Long
)

data class BudgetMonthMemberAllocationResult(
    val userId: Long,
    val nickname: String,
    val amount: Long
)
