package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetAllocation
import com.woorilog.domain.budget.entity.BudgetAllocationScope
import com.woorilog.domain.budget.repository.BudgetAllocationRepository
import org.springframework.stereotype.Repository

@Repository
class BudgetAllocationRepositoryImpl(
    private val jpaRepository: BudgetAllocationJpaRepository,
) : BudgetAllocationRepository {
    override fun findByIdOrNull(id: Long): BudgetAllocation? = jpaRepository.findById(id).orElse(null)
    override fun findByBudgetPeriodIdOrderById(budgetPeriodId: Long) = jpaRepository.findByBudgetPeriodIdOrderById(budgetPeriodId)
    override fun findByBudgetPeriodIdAndScopeAndOwnerId(budgetPeriodId: Long, scope: BudgetAllocationScope, ownerId: Long?) =
        jpaRepository.findByBudgetPeriodIdAndScopeAndOwnerId(budgetPeriodId, scope, ownerId)
    override fun save(budgetAllocation: BudgetAllocation): BudgetAllocation = jpaRepository.save(budgetAllocation)
}
