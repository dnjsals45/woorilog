package com.woorilog.domain.scheduled.repository

import com.woorilog.domain.scheduled.entity.RecurringTransactionTemplate

interface RecurringTransactionTemplateRepository {
    fun findByIdOrNull(id: Long): RecurringTransactionTemplate?
    fun findByLedgerIdOrderByIdDesc(ledgerId: Long): List<RecurringTransactionTemplate>
    fun findByLedgerIdAndPausedFalse(ledgerId: Long): List<RecurringTransactionTemplate>
    fun findByPausedFalse(): List<RecurringTransactionTemplate>
    fun save(recurringTransactionTemplate: RecurringTransactionTemplate): RecurringTransactionTemplate
    fun delete(recurringTransactionTemplate: RecurringTransactionTemplate)
}
