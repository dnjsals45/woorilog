package com.woorilog.infrastructure.persistence.scheduled

import com.woorilog.domain.scheduled.entity.RecurringTransactionTemplate
import org.springframework.data.jpa.repository.JpaRepository

interface RecurringTransactionTemplateJpaRepository : JpaRepository<RecurringTransactionTemplate, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<RecurringTransactionTemplate>
    fun findByLedgerIdAndPausedFalse(ledgerId: Long): List<RecurringTransactionTemplate>
    fun findByPausedFalse(): List<RecurringTransactionTemplate>
}
