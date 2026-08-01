package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetThresholdState
import com.woorilog.domain.budget.repository.BudgetThresholdStateRepository
import org.springframework.stereotype.Repository

@Repository
class BudgetThresholdStateRepositoryImpl(
    private val jpaRepository: BudgetThresholdStateJpaRepository,
) : BudgetThresholdStateRepository {
    override fun findByStateKey(stateKey: String): BudgetThresholdState? = jpaRepository.findByStateKey(stateKey)
    override fun save(budgetThresholdState: BudgetThresholdState): BudgetThresholdState = jpaRepository.save(budgetThresholdState)
}
