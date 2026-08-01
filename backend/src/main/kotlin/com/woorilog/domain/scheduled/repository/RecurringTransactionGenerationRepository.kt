package com.woorilog.domain.scheduled.repository

import com.woorilog.domain.scheduled.entity.RecurringTransactionGeneration
import java.time.LocalDate

interface RecurringTransactionGenerationRepository {
    fun existsByTemplateIdAndGeneratedDate(templateId: Long, generatedDate: LocalDate): Boolean
    fun findByTemplateId(templateId: Long): List<RecurringTransactionGeneration>
    fun deleteByTemplateId(templateId: Long): Int
    fun detachTransactions(transactionIds: Collection<Long>): Int
    fun save(recurringTransactionGeneration: RecurringTransactionGeneration): RecurringTransactionGeneration
}
