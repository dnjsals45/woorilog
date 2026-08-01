package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.BudgetThresholdState

interface BudgetThresholdStateRepository {
    fun findByStateKey(stateKey: String): BudgetThresholdState?
    fun save(budgetThresholdState: BudgetThresholdState): BudgetThresholdState
}
