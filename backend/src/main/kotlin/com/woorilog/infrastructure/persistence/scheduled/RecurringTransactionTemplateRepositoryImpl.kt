package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.RecurringTransactionTemplate
import com.woorilog.domain.scheduled.repository.RecurringTransactionTemplateRepository
import org.springframework.stereotype.Repository

@Repository
class RecurringTransactionTemplateRepositoryImpl(
    private val jpaRepository: RecurringTransactionTemplateJpaRepository,
) : RecurringTransactionTemplateRepository {
    override fun findByIdOrNull(id: Long): RecurringTransactionTemplate? = jpaRepository.findById(id).orElse(null)
    override fun findByLedgerIdOrderByIdDesc(ledgerId: Long) = jpaRepository.findByLedgerIdOrderByIdDesc(ledgerId)
    override fun findByLedgerIdAndPausedFalse(ledgerId: Long) = jpaRepository.findByLedgerIdAndPausedFalse(ledgerId)
    override fun findByPausedFalse() = jpaRepository.findByPausedFalse()
    override fun save(recurringTransactionTemplate: RecurringTransactionTemplate): RecurringTransactionTemplate =
        jpaRepository.save(recurringTransactionTemplate)
    override fun delete(recurringTransactionTemplate: RecurringTransactionTemplate) = jpaRepository.delete(recurringTransactionTemplate)
}
