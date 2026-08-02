package com.woorilog.infrastructure.persistence.budget

import com.woorilog.domain.budget.entity.BudgetPeriod
import com.woorilog.domain.budget.repository.BudgetPeriodRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class BudgetPeriodRepositoryImpl(
    private val jpaRepository: BudgetPeriodJpaRepository,
) : BudgetPeriodRepository {
    override fun findByIdOrNull(id: Long): BudgetPeriod? = jpaRepository.findById(id).orElse(null)
    override fun findAll(): List<BudgetPeriod> = jpaRepository.findAll()
    override fun findByLedgerIdAndStartDate(ledgerId: Long, startDate: LocalDate) = jpaRepository.findByLedgerIdAndStartDate(ledgerId, startDate)
    override fun findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId: Long, startDate: LocalDate, endDate: LocalDate) =
        jpaRepository.findFirstByLedgerIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(ledgerId, startDate, endDate)
    override fun findByLedgerIdOrderByStartDateDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByStartDateDesc(ledgerId)
    override fun findFirstByLedgerIdAndStartDateLessThanOrderByStartDateDesc(ledgerId: Long, startDate: LocalDate) =
        jpaRepository.findFirstByLedgerIdAndStartDateLessThanOrderByStartDateDesc(ledgerId, startDate)
    override fun save(budgetPeriod: BudgetPeriod): BudgetPeriod = jpaRepository.save(budgetPeriod)
}
