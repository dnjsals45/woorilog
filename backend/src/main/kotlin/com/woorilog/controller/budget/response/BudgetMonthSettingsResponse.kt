package com.woorilog.controller.budget.response

import com.woorilog.application.budget.result.BudgetMonthCategoryBudgetResult
import com.woorilog.application.budget.result.BudgetMonthMemberAllocationResult
import com.woorilog.application.budget.result.BudgetMonthSettingsResult
import com.woorilog.domain.category.entity.CategoryType

data class BudgetMonthSettingsResponse(
    val ledgerId: Long,
    val budgetMonth: String,
    val totalBudgetAmount: Long,
    val fixedBudgetTotalAmount: Long,
    val closed: Boolean,
    val categoryBudgets: List<BudgetMonthCategoryBudgetResponse>,
    val memberAllocations: List<BudgetMonthMemberAllocationResponse>
)

data class BudgetMonthCategoryBudgetResponse(
    val categoryId: Long,
    val name: String,
    val type: CategoryType,
    val categoryGroupId: Long,
    val categoryGroupName: String,
    val amount: Long
)

data class BudgetMonthMemberAllocationResponse(
    val userId: Long,
    val nickname: String,
    val amount: Long
)

fun BudgetMonthSettingsResult.toResponse() = BudgetMonthSettingsResponse(
    ledgerId = ledgerId,
    budgetMonth = budgetMonth,
    totalBudgetAmount = totalBudgetAmount,
    fixedBudgetTotalAmount = fixedBudgetTotalAmount,
    closed = closed,
    categoryBudgets = categoryBudgets.map { it.toResponse() },
    memberAllocations = memberAllocations.map { it.toResponse() },
)

fun BudgetMonthCategoryBudgetResult.toResponse() = BudgetMonthCategoryBudgetResponse(categoryId, name, type, categoryGroupId, categoryGroupName, amount)
fun BudgetMonthMemberAllocationResult.toResponse() = BudgetMonthMemberAllocationResponse(userId, nickname, amount)
