package com.woorilog.infrastructure.persistence.settlement

import com.woorilog.domain.settlement.entity.SettlementPayment
import com.woorilog.domain.settlement.repository.SettlementPaymentRepository
import org.springframework.stereotype.Repository

@Repository
class SettlementPaymentRepositoryImpl(
    private val jpaRepository: SettlementPaymentJpaRepository,
) : SettlementPaymentRepository {
    override fun findByIdOrNull(id: Long): SettlementPayment? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId: Long, budgetMonth: String) =
        jpaRepository.findByLedgerIdAndBudgetMonthOrderBySettledAtDescIdDesc(ledgerId, budgetMonth)
    override fun save(settlementPayment: SettlementPayment): SettlementPayment = jpaRepository.save(settlementPayment)
    override fun delete(settlementPayment: SettlementPayment) = jpaRepository.delete(settlementPayment)
}
