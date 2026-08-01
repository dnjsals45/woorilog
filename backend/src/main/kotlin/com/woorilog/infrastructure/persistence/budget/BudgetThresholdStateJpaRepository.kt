package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetThresholdState
import org.springframework.data.jpa.repository.JpaRepository

interface BudgetThresholdStateJpaRepository : JpaRepository<BudgetThresholdState, Long> {
    fun findByStateKey(stateKey: String): BudgetThresholdState?
}
