package com.woorilog.domain.ledger.repository

import com.woorilog.domain.ledger.entity.LedgerMonth

interface LedgerMonthRepository {
    fun findByLedgerIdAndBudgetMonth(ledgerId: Long, budgetMonth: String): LedgerMonth?
    fun save(ledgerMonth: LedgerMonth): LedgerMonth
}
