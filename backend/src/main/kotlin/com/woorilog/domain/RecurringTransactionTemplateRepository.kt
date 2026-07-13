package com.woorilog.domain

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface RecurringTransactionTemplateRepository : JpaRepository<RecurringTransactionTemplate, Long> {
    fun existsByCategoryId(categoryId: Long): Boolean

    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<RecurringTransactionTemplate>
    fun findByLedgerIdAndPausedFalse(ledgerId: Long): List<RecurringTransactionTemplate>
}
