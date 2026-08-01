package com.woorilog.infrastructure.persistence.settlement

import com.woorilog.domain.settlement.entity.SettlementPayment
import org.springframework.data.jpa.repository.JpaRepository

interface SettlementPaymentJpaRepository : JpaRepository<SettlementPayment, Long> {
    fun findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId: Long, budgetMonth: String): List<SettlementPayment>
}
