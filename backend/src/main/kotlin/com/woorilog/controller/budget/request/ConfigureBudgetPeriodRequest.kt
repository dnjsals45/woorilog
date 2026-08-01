package com.woorilog.controller.budget.request

import com.woorilog.application.budget.command.CategoryBudgetInput
import com.woorilog.application.budget.command.ConfigureBudgetPeriodCommand
import com.woorilog.application.budget.command.PersonalAllocationInput
import com.woorilog.application.budget.result.BudgetSourceResponse
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank

data class ConfigureBudgetPeriodRequest(
    @field:Min(0) val totalBudget: Long,
    val personalAllocations: List<PersonalAllocationRequest> = emptyList(),
    @field:Min(0) val sharedAllocation: Long = 0,
    val categoryBudgets: List<CategoryBudgetRequest> = emptyList(),
    val increaseTotalBudgetIfNeeded: Boolean = false,
    val applyToFutureDefaults: Boolean = false,
) {
    fun toCommand() = ConfigureBudgetPeriodCommand(
        totalBudget = totalBudget,
        personalAllocations = personalAllocations.map { PersonalAllocationInput(it.userId, it.amount) },
        sharedAllocation = sharedAllocation,
        categoryBudgets = categoryBudgets.map {
            CategoryBudgetInput(
                BudgetSourceResponse(it.source.type, it.source.ownerUserId),
                it.groupCode,
                it.amount,
            )
        },
        increaseTotalBudgetIfNeeded = increaseTotalBudgetIfNeeded,
        applyToFutureDefaults = applyToFutureDefaults,
    )
}
data class PersonalAllocationRequest(val userId: Long, @field:Min(0) val amount: Long)
data class CategoryBudgetRequest(@field:Valid val source: BudgetSourceRequest, @field:NotBlank val groupCode: String, @field:Min(0) val amount: Long)
