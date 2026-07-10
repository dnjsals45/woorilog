package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.time.LocalDate

@Repository
interface RecurringTransactionGenerationRepository : JpaRepository<RecurringTransactionGeneration, Long> {
    fun existsByTemplateIdAndGeneratedDate(templateId: Long, generatedDate: LocalDate): Boolean
}
