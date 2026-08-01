package com.woorilog.infrastructure.persistence.ledger

import com.woorilog.domain.ledger.entity.LedgerMonth
import com.woorilog.domain.ledger.repository.LedgerMonthRepository
import org.springframework.stereotype.Repository

@Repository
class LedgerMonthRepositoryImpl(
    private val jpaRepository: LedgerMonthJpaRepository,
) : LedgerMonthRepository {
    override fun findByLedgerIdAndBudgetMonth(ledgerId: Long, budgetMonth: String) = jpaRepository.findByLedgerIdAndBudgetMonth(ledgerId, budgetMonth)
    override fun save(ledgerMonth: LedgerMonth): LedgerMonth = jpaRepository.save(ledgerMonth)
}
