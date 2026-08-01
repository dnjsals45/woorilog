package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.AllocationCategoryBudget
import com.woorilog.domain.budget.repository.AllocationCategoryBudgetRepository
import org.springframework.stereotype.Repository

@Repository
class AllocationCategoryBudgetRepositoryImpl(
    private val jpaRepository: AllocationCategoryBudgetJpaRepository,
) : AllocationCategoryBudgetRepository {
    override fun findByBudgetAllocationId(budgetAllocationId: Long) = jpaRepository.findByBudgetAllocationId(budgetAllocationId)
    override fun save(allocationCategoryBudget: AllocationCategoryBudget): AllocationCategoryBudget = jpaRepository.save(allocationCategoryBudget)
    override fun deleteAllInBatch(allocationCategoryBudgets: List<AllocationCategoryBudget>) = jpaRepository.deleteAllInBatch(allocationCategoryBudgets)
}
