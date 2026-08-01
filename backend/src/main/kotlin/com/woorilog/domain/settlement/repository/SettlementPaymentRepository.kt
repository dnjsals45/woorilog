package com.woorilog.domain.settlement.repository

import com.woorilog.domain.settlement.entity.SettlementPayment

interface SettlementPaymentRepository {
    fun findByIdOrNull(id: Long): SettlementPayment?
    fun findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId: Long, budgetMonth: String): List<SettlementPayment>
    fun save(settlementPayment: SettlementPayment): SettlementPayment
    fun delete(settlementPayment: SettlementPayment)
}
