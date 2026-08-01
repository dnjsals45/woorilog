package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.CategoryBudget
import com.woorilog.domain.budget.repository.CategoryBudgetRepository
import org.springframework.stereotype.Repository

@Repository
class CategoryBudgetRepositoryImpl(
    private val jpaRepository: CategoryBudgetJpaRepository,
) : CategoryBudgetRepository {
    override fun findByLedgerMonthId(ledgerMonthId: Long) = jpaRepository.findByLedgerMonthId(ledgerMonthId)
    override fun deleteByLedgerMonthId(ledgerMonthId: Long) = jpaRepository.deleteByLedgerMonthId(ledgerMonthId)
    override fun saveAll(categoryBudgets: List<CategoryBudget>): List<CategoryBudget> = jpaRepository.saveAll(categoryBudgets)
    override fun flush() = jpaRepository.flush()
}
