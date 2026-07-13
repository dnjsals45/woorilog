package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface SettlementPaymentRepository : JpaRepository<SettlementPayment, Long> {
    fun findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId: Long, budgetMonth: String): List<SettlementPayment>
}
