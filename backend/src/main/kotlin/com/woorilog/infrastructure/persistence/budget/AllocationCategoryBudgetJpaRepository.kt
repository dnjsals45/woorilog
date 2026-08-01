package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.AllocationCategoryBudget
import org.springframework.data.jpa.repository.JpaRepository

interface AllocationCategoryBudgetJpaRepository : JpaRepository<AllocationCategoryBudget, Long> {
    fun findByBudgetAllocationId(budgetAllocationId: Long): List<AllocationCategoryBudget>
    fun findByBudgetAllocationIdAndCategoryGroupCode(
        budgetAllocationId: Long,
        categoryGroupCode: String,
    ): AllocationCategoryBudget?
}
