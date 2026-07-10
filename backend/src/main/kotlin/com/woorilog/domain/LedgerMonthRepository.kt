package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface LedgerMonthRepository : JpaRepository<LedgerMonth, Long> {
    fun findByLedgerIdAndBudgetMonth(ledgerId: Long, budgetMonth: String): LedgerMonth?
}
