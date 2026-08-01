package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.LedgerMonth
import org.springframework.data.jpa.repository.JpaRepository

interface LedgerMonthJpaRepository : JpaRepository<LedgerMonth, Long> {
    fun findByLedgerIdAndBudgetMonth(ledgerId: Long, budgetMonth: String): LedgerMonth?
}
