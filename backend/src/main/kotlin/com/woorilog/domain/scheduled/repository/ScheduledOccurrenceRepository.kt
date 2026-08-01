package com.woorilog.domain.scheduled.repository

import com.woorilog.domain.scheduled.entity.ScheduledOccurrence
import com.woorilog.domain.scheduled.entity.ScheduledOccurrenceStatus
import java.time.LocalDate

interface ScheduledOccurrenceRepository {
    fun lockDue(dueDate: LocalDate): List<ScheduledOccurrence>
    fun findByPlanIdAndStatus(planId: Long, status: ScheduledOccurrenceStatus): List<ScheduledOccurrence>
    fun findByPlanIdOrderBySequence(planId: Long): List<ScheduledOccurrence>
    fun findByLedgerAndDueDateBetweenAndStatus(
        ledgerId: Long,
        startDate: LocalDate,
        endDate: LocalDate,
        status: ScheduledOccurrenceStatus,
    ): List<ScheduledOccurrence>
    fun save(scheduledOccurrence: ScheduledOccurrence): ScheduledOccurrence
}
