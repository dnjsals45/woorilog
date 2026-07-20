package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.data.repository.query.Param
import java.time.LocalDate

@Repository
interface RecurringTransactionGenerationRepository : JpaRepository<RecurringTransactionGeneration, Long> {
    fun existsByTemplateIdAndGeneratedDate(templateId: Long, generatedDate: LocalDate): Boolean

    fun findByTemplateId(templateId: Long): List<RecurringTransactionGeneration>

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from RecurringTransactionGeneration generation where generation.template.id = :templateId")
    fun deleteByTemplateId(@Param("templateId") templateId: Long): Int

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update RecurringTransactionGeneration generation set generation.transaction = null where generation.transaction.id = :transactionId")
    fun detachTransaction(@Param("transactionId") transactionId: Long): Int
}
