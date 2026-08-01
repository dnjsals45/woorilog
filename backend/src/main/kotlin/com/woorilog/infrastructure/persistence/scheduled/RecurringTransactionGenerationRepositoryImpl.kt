package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.RecurringTransactionGeneration
import com.woorilog.domain.scheduled.repository.RecurringTransactionGenerationRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
class RecurringTransactionGenerationRepositoryImpl(
    private val jpaRepository: RecurringTransactionGenerationJpaRepository,
) : RecurringTransactionGenerationRepository {
    override fun existsByTemplateIdAndGeneratedDate(templateId: Long, generatedDate: LocalDate) =
        jpaRepository.existsByTemplateIdAndGeneratedDate(templateId, generatedDate)
    override fun findByTemplateId(templateId: Long) = jpaRepository.findByTemplateId(templateId)
    override fun deleteByTemplateId(templateId: Long) = jpaRepository.deleteByTemplateId(templateId)
    override fun detachTransactions(transactionIds: Collection<Long>) = jpaRepository.detachTransactions(transactionIds)
    override fun save(recurringTransactionGeneration: RecurringTransactionGeneration): RecurringTransactionGeneration =
        jpaRepository.save(recurringTransactionGeneration)
}
