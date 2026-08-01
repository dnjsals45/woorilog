package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.AllocationCategoryBudget

interface AllocationCategoryBudgetRepository {
    fun findByBudgetAllocationId(budgetAllocationId: Long): List<AllocationCategoryBudget>
    fun save(allocationCategoryBudget: AllocationCategoryBudget): AllocationCategoryBudget
    fun deleteAllInBatch(allocationCategoryBudgets: List<AllocationCategoryBudget>)
}
