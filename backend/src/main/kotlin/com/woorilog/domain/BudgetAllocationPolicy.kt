package com.woorilog.domain

data class BudgetAllocationDecision(
    val totalBudget: Long,
    val reserveAmount: Long,
)

object BudgetAllocationPolicy {
    fun decide(
        totalBudget: Long,
        allocationAmounts: Collection<Long>,
        approveTotalIncrease: Boolean,
    ): BudgetAllocationDecision {
        require(totalBudget >= 0) { "Total budget cannot be negative." }
        require(allocationAmounts.all { it >= 0 }) { "Allocation amount cannot be negative." }

        val allocated = allocationAmounts.fold(0L, Math::addExact)
        if (allocated > totalBudget && !approveTotalIncrease) {
            throw BudgetAllocationIncreaseApprovalRequired(allocated)
        }

        val resolvedTotal = maxOf(totalBudget, allocated)
        return BudgetAllocationDecision(
            totalBudget = resolvedTotal,
            reserveAmount = resolvedTotal - allocated,
        )
    }
}

class BudgetAllocationIncreaseApprovalRequired(
    val requiredTotalBudget: Long,
) : IllegalArgumentException("Increasing the total budget requires explicit approval.")
