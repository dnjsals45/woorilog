package com.woorilog.domain.budget.repository

import com.woorilog.domain.budget.entity.CategoryBudget

interface CategoryBudgetRepository {
    fun findByLedgerMonthId(ledgerMonthId: Long): List<CategoryBudget>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
    fun saveAll(categoryBudgets: List<CategoryBudget>): List<CategoryBudget>
    fun flush()
}
