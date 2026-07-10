package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CategoryBudgetRepository : JpaRepository<CategoryBudget, Long> {
    fun findByLedgerMonthId(ledgerMonthId: Long): List<CategoryBudget>
    fun deleteByLedgerMonthId(ledgerMonthId: Long)
}
