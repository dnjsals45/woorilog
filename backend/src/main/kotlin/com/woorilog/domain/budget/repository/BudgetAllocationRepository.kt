package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope

interface BudgetAllocationRepository {
    fun findByIdOrNull(id: Long): BudgetAllocation?
    fun findByBudgetPeriodIdOrderById(budgetPeriodId: Long): List<BudgetAllocation>
    fun findByBudgetPeriodIdAndScopeAndOwnerId(
        budgetPeriodId: Long,
        scope: BudgetAllocationScope,
        ownerId: Long?,
    ): BudgetAllocation?
    fun save(budgetAllocation: BudgetAllocation): BudgetAllocation
}
