package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import org.springframework.data.jpa.repository.JpaRepository

interface BudgetAllocationJpaRepository : JpaRepository<BudgetAllocation, Long> {
    fun findByBudgetPeriodIdOrderById(budgetPeriodId: Long): List<BudgetAllocation>
    fun findByBudgetPeriodIdAndScopeAndOwnerId(
        budgetPeriodId: Long,
        scope: BudgetAllocationScope,
        ownerId: Long?,
    ): BudgetAllocation?
}
